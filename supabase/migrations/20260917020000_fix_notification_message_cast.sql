-- Fix "structure of query does not match function result type" trên /dashboard/notifications.
-- Cột notification_batches.message trên production là varchar(1000), trong khi
-- 2 hàm dưới khai báo RETURNS TABLE (... message text ...). Postgres so khớp
-- kiểu trả về nghiêm ngặt nên SELECT b.message (varchar) vào cột text bị lỗi.
-- Cast tường minh ::text để hàm chạy đúng với cả varchar lẫn text.
create or replace function public.list_my_notifications(
  p_before_created_at timestamptz default null, p_before_id bigint default null,
  p_limit integer default 30, p_unread_only boolean default false, p_direct_only boolean default false
) returns table (id bigint, batch_id bigint, title text, message text, read_at timestamptz,
  created_at timestamptz, is_direct boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor fields are required' using errcode = '22023';
  end if;
  return query select r.id, b.id, b.title::text, b.message::text, r.read_at, r.created_at,
    b.audience_mode = 'selected'
  from public.notification_recipients r join public.notification_batches b on b.id = r.batch_id
  where r.recipient_id = auth.uid() and b.revoked_at is null
    and (not coalesce(p_unread_only, false) or r.read_at is null)
    and (not coalesce(p_direct_only, false) or b.audience_mode = 'selected')
    and (p_before_created_at is null or (r.created_at, r.id) < (p_before_created_at, p_before_id))
  order by r.created_at desc, r.id desc limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

create or replace function public.list_notification_batches(
  p_before_created_at timestamptz default null, p_before_id bigint default null, p_limit integer default 30
) returns table (id bigint, title text, message text, created_at timestamptz, is_direct boolean,
  recipient_count integer, revoked_at timestamptz, legacy boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor fields are required' using errcode = '22023';
  end if;
  return query select b.id, b.title::text, b.message::text, b.created_at, b.audience_mode = 'selected',
    b.recipient_count, b.revoked_at, b.legacy from public.notification_batches b
  where p_before_created_at is null or (b.created_at, b.id) < (p_before_created_at, p_before_id)
  order by b.created_at desc, b.id desc limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;
