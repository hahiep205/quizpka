-- Let the admin detail modal page only through recipients that read the batch.

drop function if exists public.list_notification_batch_recipients(bigint, uuid, integer);

create function public.list_notification_batch_recipients(
  p_batch_id bigint, p_after_id uuid default null, p_limit integer default 50,
  p_read_only boolean default false
) returns table (id uuid, display_name text, email text, read_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  return query select r.recipient_id, p.display_name::text, p.email::text, r.read_at
  from public.notification_recipients r left join public.profiles p on p.id = r.recipient_id
  where r.batch_id = p_batch_id and (p_after_id is null or r.recipient_id > p_after_id)
    and (not coalesce(p_read_only, false) or r.read_at is not null)
  order by r.recipient_id limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

revoke all on function public.list_notification_batch_recipients(bigint, uuid, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.list_notification_batch_recipients(bigint, uuid, integer, boolean)
  to authenticated;
