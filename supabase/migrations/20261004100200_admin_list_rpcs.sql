-- M3: server-side admin listing RPCs.
--
-- Motivation (log-cost): AdminPage used to dump ENTIRE tables through
-- paginated requests (profiles offset 0..2000 + user_learning_stats at the
-- same offsets -> guaranteed HTTP 416, user_activity_events offset 0..12000,
-- practice_attempts, all orders) — 4 requests per page, dozens of log lines
-- per admin page view. These RPCs return exactly one bounded page plus the
-- aggregates the client used to compute over the full arrays.
--
-- Pattern follows search_notification_recipients (20260909210000):
-- security definer, search_path = '', is_admin() gate, clamped limits,
-- jsonb result. All are read-only. RLS on the underlying tables stays
-- unchanged; definer context bypasses it, hence the explicit is_admin().

create or replace function public.admin_list_users(
  p_query text default '',
  p_role text default 'all',
  p_status text default 'all',
  p_engagement_days integer default null,
  p_user_ids uuid[] default null,
  p_sort text default 'created_at',
  p_desc boolean default true,
  p_offset integer default 0,
  p_limit integer default 15
) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
  v_sort text := coalesce(p_sort, 'created_at');
  v_offset integer := greatest(0, least(coalesce(p_offset, 0), 100000));
  v_limit integer := greatest(1, least(coalesce(p_limit, 15), 100));
  v_items jsonb;
  v_total bigint;
  v_kpis jsonb;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  if p_role not in ('all', 'user', 'admin') or p_status not in ('all', 'active', 'blocked')
     or (p_engagement_days is not null and p_engagement_days not in (7, 30))
     or coalesce(cardinality(p_user_ids), 0) > 200 then
    raise exception 'Invalid admin_list_users filters' using errcode = '22023';
  end if;
  if v_sort not in ('created_at', 'last_active', 'attempts', 'points', 'accuracy', 'display_name') then
    v_sort := 'created_at';
  end if;
  -- Escaped substring pattern (client used case-insensitive includes()).
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\%') || '%';

  -- KPIs + global counts over the whole join (client computed them over the
  -- full dumped array; fields mirror computeAdminKpis in adminStats.ts).
  select to_jsonb(k) into v_kpis from (
    select
      count(*)::integer as total_logined,
      count(*) filter (where p.status = 'active')::integer as active_account,
      count(*) filter (where p.status = 'blocked')::integer as blocked_account,
      count(*) filter (where p.status = 'active'
        and (coalesce(s.attempts, 0) > 0 or coalesce(s.week_attempts, 0) > 0)
        and s.updated_at >= now() - interval '7 days')::integer as active_7d,
      count(*) filter (where p.status = 'active'
        and (coalesce(s.attempts, 0) > 0 or coalesce(s.week_attempts, 0) > 0)
        and s.updated_at >= now() - interval '30 days')::integer as active_30d,
      coalesce(sum(coalesce(s.attempts, 0)), 0)::bigint as total_attempts,
      coalesce(round(avg(s.average_accuracy) filter (where coalesce(s.attempts, 0) > 0)), 0)::integer as avg_accuracy,
      coalesce(sum(coalesce(s.total_duration_seconds, 0)), 0)::bigint as total_duration_seconds,
      count(*) filter (where p.created_at >= now() - interval '7 days')::integer as new_7d,
      count(*) filter (where (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date
        = (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer as new_today
    from public.profiles p
    left join public.user_learning_stats s on s.user_id = p.id
  ) k;

  select count(*) into v_total
  from public.profiles p
  left join public.user_learning_stats s on s.user_id = p.id
  where (p_role = 'all' or p.role = p_role)
    and (p_status = 'all' or p.status = p_status)
    and (p_engagement_days is null or (
      p.status = 'active'
      and (coalesce(s.attempts, 0) > 0 or coalesce(s.week_attempts, 0) > 0)
      and s.updated_at >= now() - make_interval(days => p_engagement_days)))
    and (p_user_ids is null or p.id = any(p_user_ids))
    and (v_query = '' or p.email ilike v_pattern
      or p.display_name ilike v_pattern or p.id::text ilike v_pattern);

  -- Static CASE-based ORDER BY: only the branch matching (v_sort, p_desc)
  -- is non-null, so this is equivalent to a whitelisted dynamic ORDER BY
  -- without dynamic SQL. p.id is the stable tie-breaker.
  select coalesce(jsonb_agg(to_jsonb(t) order by t._rn), '[]'::jsonb) into v_items
  from (
    select row_number() over (order by
        case when v_sort = 'attempts' and p_desc then coalesce(s.attempts, 0) end desc nulls last,
        case when v_sort = 'attempts' and not p_desc then coalesce(s.attempts, 0) end asc nulls last,
        case when v_sort = 'points' and p_desc then coalesce(s.points, 0) end desc nulls last,
        case when v_sort = 'points' and not p_desc then coalesce(s.points, 0) end asc nulls last,
        case when v_sort = 'accuracy' and p_desc then coalesce(s.average_accuracy, 0) end desc nulls last,
        case when v_sort = 'accuracy' and not p_desc then coalesce(s.average_accuracy, 0) end asc nulls last,
        case when v_sort = 'created_at' and p_desc then p.created_at end desc nulls last,
        case when v_sort = 'created_at' and not p_desc then p.created_at end asc nulls last,
        case when v_sort = 'last_active' and p_desc then s.updated_at end desc nulls last,
        case when v_sort = 'last_active' and not p_desc then s.updated_at end asc nulls last,
        case when v_sort = 'display_name' and p_desc
          then lower(coalesce(p.display_name, coalesce(p.email, p.id::text))) end desc nulls last,
        case when v_sort = 'display_name' and not p_desc
          then lower(coalesce(p.display_name, coalesce(p.email, p.id::text))) end asc nulls last,
        p.id asc) as _rn,
      p.id, p.email, p.display_name, p.avatar_url, p.role, p.status,
      p.blocked_reason, p.blocked_at, p.created_at,
      coalesce(s.attempts, 0) as attempts,
      coalesce(s.average_accuracy, 0) as average_accuracy,
      coalesce(s.total_duration_seconds, 0) as total_duration_seconds,
      coalesce(s.subjects_reviewed, 0) as subjects_reviewed,
      coalesce(s.points, 0) as points,
      coalesce(s.week_attempts, 0) as week_attempts,
      coalesce(s.week_average_accuracy, 0) as week_average_accuracy,
      coalesce(s.week_points, 0) as week_points,
      coalesce(s.visible, true) as visible,
      s.updated_at
    from public.profiles p
    left join public.user_learning_stats s on s.user_id = p.id
    where (p_role = 'all' or p.role = p_role)
      and (p_status = 'all' or p.status = p_status)
      and (p_engagement_days is null or (
        p.status = 'active'
        and (coalesce(s.attempts, 0) > 0 or coalesce(s.week_attempts, 0) > 0)
        and s.updated_at >= now() - make_interval(days => p_engagement_days)))
      and (p_user_ids is null or p.id = any(p_user_ids))
      and (v_query = '' or p.email ilike v_pattern
        or p.display_name ilike v_pattern or p.id::text ilike v_pattern)
  ) t
  where t._rn > v_offset and t._rn <= v_offset + v_limit;

  return jsonb_build_object('items', v_items, 'total', v_total, 'kpis', v_kpis);
end;
$$;

create or replace function public.admin_list_events(p_limit integer default 3000)
returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 3000), 5000));
  v_items jsonb;
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  select count(*) into v_total from public.user_activity_events;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_items
  from (
    select e.id, e.user_id, e.event_type, e.metadata, e.created_at,
      p.display_name, p.email
    from public.user_activity_events e
    left join public.profiles p on p.id = e.user_id
    order by e.id desc
    limit v_limit
  ) t;
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

create or replace function public.admin_list_attempts(p_limit integer default 3000)
returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 3000), 5000));
  v_items jsonb;
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  select count(*) into v_total from public.practice_attempts;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_items
  from (
    select a.history_id, a.user_id, a.exam_id, a.subject_id, a.title, a.mode,
      a.score, a.correct, a.total, a.accuracy, a.duration_seconds,
      a.retry_of, a.retry_number, a.completed_at,
      p.display_name, p.email
    from public.practice_attempts a
    left join public.profiles p on p.id = a.user_id
    order by a.completed_at desc, a.history_id desc
    limit v_limit
  ) t;
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

create or replace function public.admin_list_orders(
  p_since timestamptz default null,
  p_limit integer default 500
) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := coalesce(p_since, now() - interval '24 hours');
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 1000));
  v_items jsonb;
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  select count(*) into v_total from public.orders o where o.created_at >= v_since;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_items
  from (
    select o.order_id, o.user_id, o.product_id, coalesce(pr.name, o.product_id) as product_name,
      o.amount_vnd, o.currency, o.status, o.provider_transaction_id, o.paid_at, o.created_at
    from public.orders o
    left join public.products pr on pr.id = o.product_id
    where o.created_at >= v_since
    order by o.created_at desc, o.order_id desc
    limit v_limit
  ) t;
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

revoke all on function public.admin_list_users(text, text, text, integer, uuid[], text, boolean, integer, integer)
  from public, anon, authenticated;
revoke all on function public.admin_list_events(integer) from public, anon, authenticated;
revoke all on function public.admin_list_attempts(integer) from public, anon, authenticated;
revoke all on function public.admin_list_orders(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, text, text, integer, uuid[], text, boolean, integer, integer)
  to authenticated;
grant execute on function public.admin_list_events(integer) to authenticated;
grant execute on function public.admin_list_attempts(integer) to authenticated;
grant execute on function public.admin_list_orders(timestamptz, integer) to authenticated;
