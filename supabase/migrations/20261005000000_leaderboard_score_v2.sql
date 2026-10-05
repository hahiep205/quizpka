-- Điểm BXH v2: Score = 1000 × (0.55·A + Q × (0.15·C + 0.15·P + 0.15·T)).
--
--   A = (Σacc + m·p0) / (n + m), p0 = 0.6, m = 2 (làm mượt Bayes: acc 100%
--       với 1 lượt làm chỉ được A ≈ 0.73 thay vì 1.0).
--   C = min(1, số môn đã ôn / tổng số môn toàn hệ thống).
--   P = ln(1+n) / ln(21), trần 1 (n = 20 lượt đạt max).
--   T = min(1, tổng phút học / 180), trần 3 giờ.
--   Q = min(1, A / 0.6): cổng chất lượng — điểm nỗ lực (C/P/T) chỉ có giá
--       trị khi làm đúng đủ nhiều; acc dưới 60% thì phần này giảm theo tỷ lệ.
--   n = 0 lượt -> score = 0 (tránh A mặc định 0.6 đẩy user mới lên 330 điểm).
--
-- QUAN TRỌNG — sửa pipeline verified đã chết (phát hiện 2026-10-05):
-- submit_free_attempt luôn insert verified=false; luồng duy nhất từng sinh
-- verified=true (record_verified_attempt) đã bị DROP từ migration
-- 20260906250000, còn refresh_user_verified_stats thì service_role-only mà
-- KHÔNG có trigger/cron/edge nào gọi -> stats/score đóng băng, 3255/3269
-- lượt làm vô hình. Từ đây:
--  1. refresh đếm TOÀN BỘ attempts (bỏ lọc verified=true đã vô nghĩa).
--     Chống spam gian lận chuyển sang: rate-limit lúc submit (10s/lượt,
--     100/giờ trong submit_free_attempt) + cổng Q đè điểm acc thấp.
--  2. Trigger practice_attempts_refresh_stats tự gọi refresh sau mỗi lượt
--     nộp, khỏi phụ thuộc service_role gọi tay.
--
-- Thiết kế (tiết kiệm quota sau vụ spam 2026-09-29):
-- 1. Điểm được TÍNH SẴN trong refresh_user_verified_stats (chạy mỗi lần nộp
--    bài, aggregate theo user_id đã có index) và lưu vào user_learning_stats.
--    Đường đọc BXH chỉ ORDER BY score + LIMIT, không aggregate realtime.
-- 2. RPC mới get_leaderboard_score_top mirror get_leaderboard_top: rate-limit
--    30 req/phút/user, SECURITY DEFINER + is_active_user(), lọc visible,
--    kèm dòng của chính mình để tính hạng "you".
-- 3. Cột points cũ GIỮ NGUYÊN (không xóa) để rollback an toàn.

alter table public.user_learning_stats
  add column if not exists score integer not null default 0,
  add column if not exists score_a numeric not null default 0,
  add column if not exists score_c numeric not null default 0,
  add column if not exists score_p numeric not null default 0,
  add column if not exists score_t numeric not null default 0;

create or replace function public.refresh_user_verified_stats(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total_subjects integer;
begin
  -- Mẫu số của C: tổng số môn đã có lượt làm trên toàn hệ thống.
  select nullif(count(distinct subject_id), 0) into v_total_subjects
  from public.practice_attempts;

  insert into public.user_learning_stats (
    user_id, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points,
    week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points,
    month_subjects_reviewed, month_attempts, month_average_accuracy, month_total_duration_seconds, month_points,
    score, score_a, score_c, score_p, score_t,
    verified, updated_at
  )
  with user_attempts as (select * from public.practice_attempts where user_id = p_user_id),
  periods as (
    select 'all' as period, * from user_attempts
    union all select 'week', * from user_attempts where completed_at >= now() - interval '7 days'
    union all select 'month', * from user_attempts where date_trunc('month', completed_at) = date_trunc('month', now())
  ),
  aggregate as (
    select period, count(*)::integer attempts, count(distinct subject_id)::integer subjects_reviewed,
      coalesce(round(avg(accuracy)), 0)::integer average_accuracy, coalesce(sum(duration_seconds), 0)::integer total_duration_seconds,
      coalesce(sum(accuracy), 0)::numeric acc_sum
    from periods group by period
  ),
  scored as (
    select aggregate.*,
      round((least(average_accuracy, 100) * 0.5 + least((subjects_reviewed::numeric / 10) * 100, 100) * 0.15 + least((attempts::numeric / 20) * 100, 100) * 0.1 + case when attempts = 0 or total_duration_seconds = 0 then 0 when total_duration_seconds / attempts / 60.0 <= 40 then 25 else greatest(5, 25 - ((total_duration_seconds / attempts / 60.0) - 40) * 0.375) end) * 10)::integer points,
      case when attempts = 0 then 0 else (acc_sum / 100.0 + 2 * 0.6) / (attempts + 2) end comp_a,
      case when attempts = 0 or v_total_subjects is null then 0 else least(1, subjects_reviewed::numeric / v_total_subjects) end comp_c,
      case when attempts = 0 then 0 else least(1, ln(1 + attempts) / ln(21)) end comp_p,
      case when attempts = 0 then 0 else least(1, total_duration_seconds::numeric / 60 / 180) end comp_t,
      case when attempts = 0 then 0 else least(1, ((acc_sum / 100.0 + 2 * 0.6) / (attempts + 2)) / 0.6) end comp_q
    from aggregate
  ),
  final as (
    select scored.*,
      case when attempts = 0 then 0 else round((1000 * (0.55 * comp_a + comp_q * (0.15 * comp_c + 0.15 * comp_p + 0.15 * comp_t))))::integer end score
    from scored
  )
  select p_user_id,
    coalesce(a.subjects_reviewed,0), coalesce(a.attempts,0), coalesce(a.average_accuracy,0), coalesce(a.total_duration_seconds,0), coalesce(a.points,0),
    coalesce(w.subjects_reviewed,0), coalesce(w.attempts,0), coalesce(w.average_accuracy,0), coalesce(w.total_duration_seconds,0), coalesce(w.points,0),
    coalesce(m.subjects_reviewed,0), coalesce(m.attempts,0), coalesce(m.average_accuracy,0), coalesce(m.total_duration_seconds,0), coalesce(m.points,0),
    coalesce(a.score,0), coalesce(a.comp_a,0), coalesce(a.comp_c,0), coalesce(a.comp_p,0), coalesce(a.comp_t,0), true, now()
  from (select 1) x left join final a on a.period = 'all' left join final w on w.period = 'week' left join final m on m.period = 'month'
  on conflict (user_id) do update set
    subjects_reviewed = excluded.subjects_reviewed, attempts = excluded.attempts, average_accuracy = excluded.average_accuracy,
    total_duration_seconds = excluded.total_duration_seconds, points = excluded.points,
    week_subjects_reviewed = excluded.week_subjects_reviewed, week_attempts = excluded.week_attempts, week_average_accuracy = excluded.week_average_accuracy,
    week_total_duration_seconds = excluded.week_total_duration_seconds, week_points = excluded.week_points,
    month_subjects_reviewed = excluded.month_subjects_reviewed, month_attempts = excluded.month_attempts, month_average_accuracy = excluded.month_average_accuracy,
    month_total_duration_seconds = excluded.month_total_duration_seconds, month_points = excluded.month_points,
    score = excluded.score, score_a = excluded.score_a, score_c = excluded.score_c,
    score_p = excluded.score_p, score_t = excluded.score_t,
    verified = true, updated_at = now();
end;
$$;

revoke all on function public.refresh_user_verified_stats(uuid) from public, anon, authenticated;
grant execute on function public.refresh_user_verified_stats(uuid) to service_role;

-- Tự động tính lại stats + score của user ngay sau mỗi lượt nộp.
-- Chạy bằng quyền owner (SECURITY DEFINER) nên không vướng RLS/grants;
-- mở EXECUTE cho authenticated để trigger chắc chắn được kích hoạt.
create or replace function public.trigger_refresh_user_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_user_verified_stats(new.user_id);
  return new;
end;
$$;

revoke all on function public.trigger_refresh_user_stats() from public, anon;
grant execute on function public.trigger_refresh_user_stats() to authenticated, service_role;

drop trigger if exists practice_attempts_refresh_stats on public.practice_attempts;
create trigger practice_attempts_refresh_stats
  after insert on public.practice_attempts
  for each row execute function public.trigger_refresh_user_stats();

-- Backfill: tính lại TOÀN BỘ (stats hiển thị + score) từ attempts hiện có,
-- xóa số liệu hóa thạch lệch nhau (vd score 0 mà attempts > 0). Chạy 1 lần.
with per_user as (
  select user_id, count(*)::integer n,
    coalesce(round(avg(accuracy)), 0)::integer avg_acc,
    coalesce(sum(duration_seconds), 0)::integer total_seconds,
    coalesce(sum(accuracy), 0)::numeric acc_sum,
    count(distinct subject_id)::integer subjects
  from public.practice_attempts group by user_id
),
total as (
  select nullif(count(distinct subject_id), 0)::integer t
  from public.practice_attempts
),
computed as (
  select pu.user_id, pu.n, pu.avg_acc, pu.total_seconds, pu.subjects,
    case when pu.n = 0 then 0 else (pu.acc_sum / 100.0 + 2 * 0.6) / (pu.n + 2) end a,
    case when pu.n = 0 or t.t is null then 0 else least(1, pu.subjects::numeric / t.t) end c,
    case when pu.n = 0 then 0 else least(1, ln(1 + pu.n) / ln(21)) end p,
    case when pu.n = 0 then 0 else least(1, pu.total_seconds::numeric / 60 / 180) end tt,
    case when pu.n = 0 then 0 else least(1, ((pu.acc_sum / 100.0 + 2 * 0.6) / (pu.n + 2)) / 0.6) end q
  from per_user pu cross join total t
)
update public.user_learning_stats s
set subjects_reviewed = c.subjects, attempts = c.n,
  average_accuracy = c.avg_acc, total_duration_seconds = c.total_seconds,
  score_a = c.a, score_c = c.c, score_p = c.p, score_t = c.tt,
  score = round((1000 * (0.55 * c.a + c.q * (0.15 * c.c + 0.15 * c.p + 0.15 * c.tt))))::integer,
  updated_at = now()
from computed c where s.user_id = c.user_id;

-- User không còn lượt làm nào: reset về 0 hết (tránh hóa thạch).
update public.user_learning_stats s
set subjects_reviewed = 0, attempts = 0, average_accuracy = 0,
  total_duration_seconds = 0, score = 0,
  score_a = 0, score_c = 0, score_p = 0, score_t = 0,
  updated_at = now()
where not exists (select 1 from public.practice_attempts p where p.user_id = s.user_id);

-- Dọn cột/function thừa nếu từng chạy bản nháp cũ (score_r).
alter table public.user_learning_stats drop column if exists score_r;
drop function if exists public.get_leaderboard_score_top(integer);

create or replace function public.get_leaderboard_score_top(p_limit integer default 10)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  visible boolean,
  subjects_reviewed integer,
  attempts integer,
  average_accuracy integer,
  total_duration_seconds integer,
  score integer,
  score_a numeric,
  score_c numeric,
  score_p numeric,
  score_t numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_allowed boolean;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  -- 30 req / 60s / user. Vượt là lỗi ngay, không tốn scan.
  select public.check_edge_rate_limit(
    'leaderboard-score:' || (select auth.uid())::text, 30, 60
  ) into v_allowed;
  if not coalesce(v_allowed, false) then
    raise exception 'Too many requests, please slow down' using errcode = 'P0001';
  end if;

  v_limit := coalesce(p_limit, 10);
  if v_limit < 1 then v_limit := 1; end if;
  if v_limit > 10 then v_limit := 10; end if;

  return query
  with top_visible as (
    select s.user_id, s.display_name, s.avatar_url, s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.score, s.score_a, s.score_c, s.score_p, s.score_t
    from public.user_learning_stats s
    where s.visible = true
    order by s.score desc, s.user_id
    limit v_limit
  ),
  own as (
    select s.user_id, s.display_name, s.avatar_url, s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.score, s.score_a, s.score_c, s.score_p, s.score_t
    from public.user_learning_stats s
    where s.user_id = (select auth.uid())
    limit 1
  )
  select * from top_visible
  union
  select * from own o
  where not exists (select 1 from top_visible t where t.user_id = o.user_id);
end;
$$;

revoke all on function public.get_leaderboard_score_top(integer) from public, anon;
grant execute on function public.get_leaderboard_score_top(integer) to authenticated;

-- Index phục vụ ORDER BY score + aggregate theo user của refresh/trigger.
create index if not exists idx_user_learning_stats_score
  on public.user_learning_stats (score desc);
create index if not exists idx_practice_attempts_user
  on public.practice_attempts (user_id);
