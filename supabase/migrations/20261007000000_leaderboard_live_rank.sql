-- Stream changes to the already-materialized leaderboard rows. The browser
-- still reads through a bounded RPC; Realtime only tells it when to refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_learning_stats'
  ) then
    execute 'alter publication supabase_realtime add table public.user_learning_stats';
  end if;
end;
$$;

create or replace function public.get_leaderboard_score_top_live(p_limit integer default 10)
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
set search_path = public
as $$
declare
  v_limit integer;
  v_allowed boolean;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select public.check_edge_rate_limit(
    'leaderboard-score-live:' || (select auth.uid())::text, 30, 60
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
    where s.user_id = (select auth.uid())
    limit 1
  )
  select * from top_visible
  union all
  select * from own o
  where not exists (select 1 from top_visible t where t.user_id = o.user_id);
end;
$$;

revoke all on function public.get_leaderboard_score_top_live(integer) from public, anon;
grant execute on function public.get_leaderboard_score_top_live(integer) to authenticated;
