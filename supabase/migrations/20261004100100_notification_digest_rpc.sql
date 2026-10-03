-- M2: single round-trip notification digest for the dashboard bell.
--
-- Motivation (log-cost): one client "refresh" used to fire 2-4 RPCs
-- (count_my_unread_notifications + list_my_notifications limit 1 for the
-- direct popup + one list per opened filter), repeated every 60 seconds.
-- This digest returns everything one refresh needs in ONE jsonb response.
--
-- Row shape matches list_my_notifications exactly (id, batch_id, title,
-- message, read_at, created_at, is_direct) so the client parser stays the
-- same. The "dismissed newest direct" walk is moved server-side: the client
-- passes its dismissed ids and gets the first unread+direct row not in that
-- set (previously a client-side cursor loop over unread+direct pages).
--
-- list_my_notifications / count_my_unread_notifications stay untouched:
-- load-more cursors still use them and they remain the rollback path.

create or replace function public.get_my_notification_digest(
  p_include_unread boolean default false,
  p_dismissed_ids bigint[] default '{}',
  p_limit integer default 30
) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 100));
  v_unread_count integer;
  v_direct jsonb;
  v_items_all jsonb;
  v_items_unread jsonb;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select count(*)::integer into v_unread_count
  from public.notification_recipients r
  join public.notification_batches b on b.id = r.batch_id
  where r.recipient_id = v_uid and r.read_at is null and b.revoked_at is null;

  select to_jsonb(t) into v_direct
  from (
    select r.id, b.id as batch_id, b.title, b.message, r.read_at, r.created_at,
      b.audience_mode = 'selected' as is_direct
    from public.notification_recipients r
    join public.notification_batches b on b.id = r.batch_id
    where r.recipient_id = v_uid and b.revoked_at is null
      and r.read_at is null and b.audience_mode = 'selected'
      and not (r.id = any(coalesce(p_dismissed_ids, '{}'::bigint[])))
    order by r.created_at desc, r.id desc
    limit 1
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_items_all
  from (
    select r.id, b.id as batch_id, b.title, b.message, r.read_at, r.created_at,
      b.audience_mode = 'selected' as is_direct
    from public.notification_recipients r
    join public.notification_batches b on b.id = r.batch_id
    where r.recipient_id = v_uid and b.revoked_at is null
    order by r.created_at desc, r.id desc
    limit v_limit
  ) t;

  if coalesce(p_include_unread, false) then
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_items_unread
    from (
      select r.id, b.id as batch_id, b.title, b.message, r.read_at, r.created_at,
        b.audience_mode = 'selected' as is_direct
      from public.notification_recipients r
      join public.notification_batches b on b.id = r.batch_id
      where r.recipient_id = v_uid and b.revoked_at is null and r.read_at is null
      order by r.created_at desc, r.id desc
      limit v_limit
    ) t;
  end if;

  return jsonb_build_object(
    'unread_count', v_unread_count,
    'direct', v_direct,
    'items_all', v_items_all,
    'items_unread', v_items_unread
  );
end;
$$;

revoke all on function public.get_my_notification_digest(boolean, bigint[], integer)
  from public, anon, authenticated;
grant execute on function public.get_my_notification_digest(boolean, bigint[], integer)
  to authenticated;
