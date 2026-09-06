alter table public.notifications add column if not exists revoked_at timestamptz;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select to authenticated
  using (public.is_active_user() and recipient_id = auth.uid() and revoked_at is null);

drop policy if exists "admin read all notifications" on public.notifications;
create policy "admin read all notifications" on public.notifications
  for select to authenticated
  using (public.is_admin());

create or replace function public.revoke_admin_notification(p_notification_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_updated integer; v_title text; v_message text; v_is_direct boolean; v_created_at timestamptz;
begin
  if not public.is_admin() then raise exception 'Only active administrators can revoke notifications'; end if;
  select title, message, is_direct, created_at into v_title, v_message, v_is_direct, v_created_at
    from public.notifications where id = p_notification_id;
  if v_created_at is null then return false; end if;
  update public.notifications set revoked_at = coalesce(revoked_at, now())
    where title = v_title and message = v_message and is_direct = v_is_direct
      and created_at between v_created_at - interval '10 seconds' and v_created_at + interval '10 seconds';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
revoke all on function public.revoke_admin_notification(bigint) from public;
grant execute on function public.revoke_admin_notification(bigint) to authenticated;
