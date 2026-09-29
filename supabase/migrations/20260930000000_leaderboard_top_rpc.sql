-- P1: leaderboard RPC server-side — chặn kiểu spam Python-urllib/Deno
-- ngày 2026-09-29: 1 user bắn ~300 req full-scan user_learning_stats trong ~2 phút.
--
-- Thiết kế:
-- 1. ORDER BY points DESC + LIMIT server-side (dùng idx_user_learning_stats_points),
--    client không bao giờ được SELECT full bảng nữa.
-- 2. Rate-limit 30 req/phút/user qua public.check_edge_rate_limit()
--    (tái dùng bảng public.edge_rate_limits của edge-guard).
-- 3. SECURITY DEFINER nhưng tự kiểm tra is_active_user() + lọc visible,
--    nên acc bị block (profiles.status <> 'active') bị từ chối ngay.
-- 4. Trả kèm dòng của chính mình (kể cả khi ẩn) để UI tính hạng "you".

create or replace function public.get_leaderboard_top(p_limit integer default 100)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  visible boolean,
  subjects_reviewed integer,
  attempts integer,
  average_accuracy integer,
  total_duration_seconds integer,
  points integer,
  week_subjects_reviewed integer,
  week_attempts integer,
  week_average_accuracy integer,
  week_total_duration_seconds integer,
  week_points integer,
  month_subjects_reviewed integer,
  month_attempts integer,
  month_average_accuracy integer,
  month_total_duration_seconds integer,
  month_points integer
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
    'leaderboard:' || (select auth.uid())::text, 30, 60
  ) into v_allowed;
  if not coalesce(v_allowed, false) then
    raise exception 'Too many requests, please slow down' using errcode = 'P0001';
  end if;

  v_limit := coalesce(p_limit, 100);
  if v_limit < 1 then v_limit := 1; end if;
  if v_limit > 200 then v_limit := 200; end if;

  return query
  with top_visible as (
    select s.user_id, s.display_name, s.avatar_url, s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.points,
      s.week_subjects_reviewed, s.week_attempts, s.week_average_accuracy,
      s.week_total_duration_seconds, s.week_points,
      s.month_subjects_reviewed, s.month_attempts, s.month_average_accuracy,
      s.month_total_duration_seconds, s.month_points
    from public.user_learning_stats s
    where s.visible = true
    order by s.points desc, s.user_id
    limit v_limit
  ),
  own as (
    select s.user_id, s.display_name, s.avatar_url, s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.points,
      s.week_subjects_reviewed, s.week_attempts, s.week_average_accuracy,
      s.week_total_duration_seconds, s.week_points,
      s.month_subjects_reviewed, s.month_attempts, s.month_average_accuracy,
      s.month_total_duration_seconds, s.month_points
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

revoke all on function public.get_leaderboard_top(integer) from public, anon;
grant execute on function public.get_leaderboard_top(integer) to authenticated;
