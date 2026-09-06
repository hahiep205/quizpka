create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 2000),
  is_direct boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select to authenticated
  using (public.is_active_user() and recipient_id = auth.uid());

drop policy if exists "users acknowledge own notifications" on public.notifications;
create policy "users acknowledge own notifications"
  on public.notifications for update to authenticated
  using (public.is_active_user() and recipient_id = auth.uid())
  with check (public.is_active_user() and recipient_id = auth.uid());

create or replace function public.send_admin_notification(
  p_title text,
  p_message text,
  p_recipient_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only active administrators can send notifications';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'Notification title must contain 1 to 120 characters';
  end if;
  if char_length(v_message) < 1 or char_length(v_message) > 2000 then
    raise exception 'Notification message must contain 1 to 2000 characters';
  end if;
  if p_recipient_id is not null and not exists (
    select 1 from public.profiles
    where id = p_recipient_id and role = 'user' and status = 'active'
  ) then
    raise exception 'Recipient does not exist or is not active';
  end if;

  insert into public.notifications (recipient_id, sender_id, title, message, is_direct)
  select p.id, auth.uid(), v_title, v_message, p_recipient_id is not null
  from public.profiles p
  where p.role = 'user'
    and p.status = 'active'
    and (p_recipient_id is null or p.id = p_recipient_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.send_admin_notification(text, text, uuid) from public;
grant execute on function public.send_admin_notification(text, text, uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
