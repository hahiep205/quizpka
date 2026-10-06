-- Keep public names current and persist leaderboard visibility on the server.
-- The previous stats refresh function never populated display_name/avatar_url,
-- so most rows fell back to the generic "Quizpka" label.

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
    select s.user_id,
      coalesce(nullif(btrim(s.display_name), ''), nullif(btrim(p.display_name), ''), 'Quizpka')::text as display_name,
      coalesce(s.avatar_url, p.avatar_url) as avatar_url,
      s.visible, s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.score, s.score_a, s.score_c, s.score_p, s.score_t
    from public.user_learning_stats s
    left join public.profiles p on p.id = s.user_id
    where s.visible = true and (s.score > 0 or s.attempts > 0)
    order by s.score desc, s.user_id
    limit v_limit
  ),
  top_visible as (
    select t.*, row_number() over (order by t.score desc, t.user_id)::integer as rank_position
    from top_limited t
  ),
  own as (
    select s.user_id,
      coalesce(nullif(btrim(s.display_name), ''), nullif(btrim(p.display_name), ''), 'Quizpka')::text as display_name,
      coalesce(s.avatar_url, p.avatar_url) as avatar_url,
      s.visible, s.subjects_reviewed, s.attempts, s.average_accuracy,
      s.total_duration_seconds, s.score, s.score_a, s.score_c, s.score_p, s.score_t,
      case when s.visible and (s.score > 0 or s.attempts > 0) then (
        select count(*)::integer + 1
        from public.user_learning_stats ahead
        where ahead.visible = true and (ahead.score > 0 or ahead.attempts > 0)
          and (ahead.score > s.score or (ahead.score = s.score and ahead.user_id < s.user_id))
      ) else null end as rank_position
    from public.user_learning_stats s
    left join public.profiles p on p.id = s.user_id
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

create or replace function public.get_my_leaderboard_visibility()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_visible boolean;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.status = 'active'
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select s.visible into v_visible
  from public.user_learning_stats s
  where s.user_id = v_user_id;
  return coalesce(v_visible, true);
end;
$$;

revoke all on function public.get_my_leaderboard_visibility() from public, anon;
grant execute on function public.get_my_leaderboard_visibility() to authenticated;

-- The browser may change only its own visibility flag through this RPC. It
-- cannot write scores or profile data, and no-op updates do not broadcast.
create or replace function public.update_my_leaderboard_visibility(p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean;
begin
  if v_user_id is null or p_visible is null or not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.status = 'active'
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select public.check_edge_rate_limit(
    'leaderboard-visibility:' || v_user_id::text, 10, 60
  ) into v_allowed;
  if not coalesce(v_allowed, false) then
    raise exception 'Too many requests, please slow down' using errcode = 'P0001';
  end if;

  insert into public.user_learning_stats (user_id, visible)
  values (v_user_id, p_visible)
  on conflict (user_id) do update
    set visible = excluded.visible
    where public.user_learning_stats.visible is distinct from excluded.visible;
end;
$$;

revoke all on function public.update_my_leaderboard_visibility(boolean) from public, anon;
grant execute on function public.update_my_leaderboard_visibility(boolean) to authenticated;

-- Name/avatar edits should refresh active leaderboard clients immediately.
create or replace function public.broadcast_leaderboard_profile_refresh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.display_name is distinct from old.display_name
      or new.avatar_url is distinct from old.avatar_url)
    and exists (select 1 from public.user_learning_stats s where s.user_id = new.id) then
    perform realtime.send('{}'::jsonb, 'leaderboard_changed', 'leaderboard:public', true);
  end if;
  return new;
end;
$$;

revoke all on function public.broadcast_leaderboard_profile_refresh() from public, anon, authenticated;
drop trigger if exists profiles_leaderboard_profile_refresh on public.profiles;
create trigger profiles_leaderboard_profile_refresh
  after update of display_name, avatar_url on public.profiles
  for each row execute function public.broadcast_leaderboard_profile_refresh();
