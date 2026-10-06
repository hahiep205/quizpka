-- Leaderboard reads and writes go through the guarded Edge Function only.
-- Public/authenticated clients must not be able to scrape the table or forge
-- their own materialized score row through PostgREST.
drop policy if exists "write own learning stats" on public.user_learning_stats;
revoke all privileges on table public.user_learning_stats from anon, authenticated;
grant select on table public.user_learning_stats to service_role;

-- Replace the Postgres Changes feed with a private, payload-free signal.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_learning_stats'
  ) then
    execute 'alter publication supabase_realtime drop table public.user_learning_stats';
  end if;
end;
$$;

drop policy if exists "active users receive leaderboard refresh" on realtime.messages;
create policy "active users receive leaderboard refresh"
  on realtime.messages
  for select
  to authenticated
  using (topic = 'leaderboard:public' and (select public.is_active_user()));

create or replace function public.broadcast_leaderboard_refresh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.visible is distinct from old.visible
      or new.display_name is distinct from old.display_name
      or new.avatar_url is distinct from old.avatar_url
      or new.score is distinct from old.score
      or new.points is distinct from old.points
      or new.subjects_reviewed is distinct from old.subjects_reviewed
      or new.attempts is distinct from old.attempts
      or new.average_accuracy is distinct from old.average_accuracy
      or new.total_duration_seconds is distinct from old.total_duration_seconds
      or new.week_subjects_reviewed is distinct from old.week_subjects_reviewed
      or new.week_attempts is distinct from old.week_attempts
      or new.week_average_accuracy is distinct from old.week_average_accuracy
      or new.week_total_duration_seconds is distinct from old.week_total_duration_seconds
      or new.week_points is distinct from old.week_points
      or new.month_subjects_reviewed is distinct from old.month_subjects_reviewed
      or new.month_attempts is distinct from old.month_attempts
      or new.month_average_accuracy is distinct from old.month_average_accuracy
      or new.month_total_duration_seconds is distinct from old.month_total_duration_seconds
      or new.month_points is distinct from old.month_points then
      perform realtime.send(
        '{}'::jsonb,
        'leaderboard_changed',
        'leaderboard:public',
        true
      );
    end if;
  else
    perform realtime.send(
      '{}'::jsonb,
      'leaderboard_changed',
      'leaderboard:public',
      true
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.broadcast_leaderboard_refresh() from public, anon, authenticated;
drop trigger if exists user_learning_stats_broadcast_refresh on public.user_learning_stats;
create trigger user_learning_stats_broadcast_refresh
  after insert or update or delete on public.user_learning_stats
  for each row execute function public.broadcast_leaderboard_refresh();

-- The Edge Function supplies the verified user id after applying IP and user limits.
drop function if exists public.get_leaderboard_score_top_live(integer);
drop function if exists public.get_leaderboard_score_top_live(uuid, integer);

create function public.get_leaderboard_score_top_live(p_user_id uuid, p_limit integer default 10)
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
  score_t numeric,
  rank_position integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_allowed boolean;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id and p.status = 'active'
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select public.check_edge_rate_limit(
    'leaderboard-score-live:' || p_user_id::text, 30, 60
  ) into v_allowed;
  if not coalesce(v_allowed, false) then
    raise exception 'Too many requests, please slow down' using errcode = 'P0001';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 10), 10));

  return query
  with top_limited as (
    select s.user_id, s.display_name, s.avatar_url, s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.score, s.score_a, s.score_c, s.score_p, s.score_t
    from public.user_learning_stats s
    where s.visible = true and (s.score > 0 or s.attempts > 0)
    order by s.score desc, s.user_id
    limit v_limit
  ),
  top_visible as (
    select t.*, row_number() over (order by t.score desc, t.user_id)::integer as rank_position
    from top_limited t
  ),
  own as (
    select s.user_id, s.display_name, s.avatar_url, s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.score, s.score_a, s.score_c, s.score_p, s.score_t,
      case when s.visible and (s.score > 0 or s.attempts > 0) then (
        select count(*)::integer + 1
        from public.user_learning_stats ahead
        where ahead.visible = true and (ahead.score > 0 or ahead.attempts > 0)
          and (ahead.score > s.score or (ahead.score = s.score and ahead.user_id < s.user_id))
      ) else null end as rank_position
    from public.user_learning_stats s
    where s.user_id = p_user_id
    limit 1
  )
  select * from top_visible
  union all
  select * from own o
  where not exists (select 1 from top_visible t where t.user_id = o.user_id);
end;
$$;

revoke all on function public.get_leaderboard_score_top_live(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_leaderboard_score_top_live(uuid, integer) to service_role;

-- Disable older client-callable routes that bypass the IP gate.
revoke all on function public.get_leaderboard_top(integer) from public, anon, authenticated;
revoke all on function public.get_leaderboard_score_top(integer) from public, anon, authenticated;
