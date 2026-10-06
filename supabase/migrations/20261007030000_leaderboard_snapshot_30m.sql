-- Replace per-change Realtime leaderboard fan-out with a shared 30-minute snapshot.

create table if not exists public.leaderboard_snapshot_cache (
  singleton boolean primary key default true check (singleton),
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array'),
  computed_at timestamptz not null default now()
);

alter table public.leaderboard_snapshot_cache enable row level security;
revoke all privileges on table public.leaderboard_snapshot_cache from public, anon, authenticated;
grant select, insert, update, delete on table public.leaderboard_snapshot_cache to service_role;

create or replace function public.refresh_leaderboard_top10_snapshot()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entries jsonb;
  v_computed_at timestamptz := now();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('leaderboard-top10-snapshot', 0));

  with ranked as (
    select s.user_id,
      coalesce(nullif(btrim(s.display_name), ''), nullif(btrim(p.display_name), ''), 'Quizpka')::text as display_name,
      coalesce(s.avatar_url, p.avatar_url) as avatar_url,
      s.visible,
      s.subjects_reviewed, s.attempts, s.average_accuracy, s.total_duration_seconds, s.points,
      s.week_subjects_reviewed, s.week_attempts, s.week_average_accuracy, s.week_total_duration_seconds, s.week_points,
      s.month_subjects_reviewed, s.month_attempts, s.month_average_accuracy, s.month_total_duration_seconds, s.month_points,
      s.score, s.score_a, s.score_c, s.score_p, s.score_t,
      row_number() over (order by s.score desc, s.user_id)::integer as rank_position
    from public.user_learning_stats s
    join public.profiles p on p.id = s.user_id and p.status = 'active'
    where s.visible = true and (s.score > 0 or s.attempts > 0)
    order by s.score desc, s.user_id
    limit 10
  )
  select coalesce(
    jsonb_agg(to_jsonb(ranked) order by ranked.rank_position),
    '[]'::jsonb
  ) into v_entries
  from ranked;

  insert into public.leaderboard_snapshot_cache(singleton, entries, computed_at)
  values (true, v_entries, v_computed_at)
  on conflict (singleton) do update
    set entries = excluded.entries,
        computed_at = excluded.computed_at;
end;
$$;

revoke all on function public.refresh_leaderboard_top10_snapshot() from public, anon, authenticated;
grant execute on function public.refresh_leaderboard_top10_snapshot() to service_role;

-- The service-role Edge Function reads only these 10 saved rows. Current
-- visibility and account status are checked at read time for immediate privacy.
drop function if exists public.get_leaderboard_top10_snapshot(uuid);
create function public.get_leaderboard_top10_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id and p.status = 'active'
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  with visible_entries as (
    select entry.value, (entry.value->>'rank_position')::integer as old_rank
    from public.leaderboard_snapshot_cache cache
    cross join lateral jsonb_array_elements(cache.entries) as entry(value)
    join public.user_learning_stats current_stats
      on current_stats.user_id = (entry.value->>'user_id')::uuid
     and current_stats.visible = true
    join public.profiles current_profile
      on current_profile.id = current_stats.user_id
     and current_profile.status = 'active'
    where cache.singleton = true
  ),
  reranked as (
    select value || jsonb_build_object(
      'rank_position', row_number() over (order by old_rank)::integer
    ) as value, old_rank
    from visible_entries
  )
  select jsonb_build_object(
    'computed_at', cache.computed_at,
    'entries', coalesce((select jsonb_agg(r.value order by r.old_rank) from reranked r), '[]'::jsonb)
  ) into v_snapshot
  from public.leaderboard_snapshot_cache cache
  where cache.singleton = true;

  return coalesce(v_snapshot, jsonb_build_object('computed_at', null, 'entries', '[]'::jsonb));
end;
$$;

revoke all on function public.get_leaderboard_top10_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_leaderboard_top10_snapshot(uuid) to service_role;

-- This endpoint returns only the caller's own precomputed score. It avoids the
-- previous full rank count, which the UI no longer displays for users outside top 10.
create or replace function public.get_my_leaderboard_score_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.status = 'active'
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select public.check_edge_rate_limit(
    'leaderboard-personal-snapshot:' || v_user_id::text, 6, 3600
  ) into v_allowed;
  if not coalesce(v_allowed, false) then
    raise exception 'Too many requests, please slow down' using errcode = 'P0001';
  end if;

  -- Rebuild only this user's materialized stats before returning their score.
  -- This prevents a stale/mismatched user_learning_stats.score (for example a
  -- legacy points value) from being presented as the current v2 leaderboard score.
  perform public.refresh_user_verified_stats(v_user_id);

  return coalesce((
    select jsonb_build_object(
      'score', s.score,
      'points', s.points,
      'visible', s.visible
    )
    from public.user_learning_stats s
    where s.user_id = v_user_id
  ), jsonb_build_object('score', 0, 'points', 0, 'visible', true));
end;
$$;

revoke all on function public.get_my_leaderboard_score_snapshot() from public, anon;
grant execute on function public.get_my_leaderboard_score_snapshot() to authenticated;

-- Retire leaderboard Realtime fan-out. The visibility RPC remains active and
-- get_leaderboard_top10_snapshot filters changes immediately on reads.
drop trigger if exists user_learning_stats_broadcast_refresh on public.user_learning_stats;
drop trigger if exists profiles_leaderboard_profile_refresh on public.profiles;
drop function if exists public.broadcast_leaderboard_refresh();
drop function if exists public.broadcast_leaderboard_profile_refresh();
drop policy if exists "active users receive leaderboard refresh" on realtime.messages;

create extension if not exists pg_cron;
select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-leaderboard-top10-snapshot';

select cron.schedule(
  'refresh-leaderboard-top10-snapshot',
  '*/30 * * * *',
  'select public.refresh_leaderboard_top10_snapshot();'
);

-- Seed a snapshot as part of deployment so the page does not wait for the first cron tick.
select public.refresh_leaderboard_top10_snapshot();
