-- Store server-observed login IPs separately from the general activity timeline.
create table if not exists public.user_login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_in_at timestamptz not null default now(),
  ip_address text not null default 'unknown' check (char_length(ip_address) between 1 and 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 1000),
  provider text check (provider is null or char_length(provider) <= 80),
  created_at timestamptz not null default now()
);

create index if not exists user_login_events_user_time_idx
  on public.user_login_events (user_id, logged_in_at desc);

alter table public.user_login_events enable row level security;

drop policy if exists "admins read login events" on public.user_login_events;
create policy "admins read login events"
  on public.user_login_events
  for select
  to authenticated
  using (public.is_admin());

revoke all on table public.user_login_events from anon, authenticated;
grant select on table public.user_login_events to authenticated;
