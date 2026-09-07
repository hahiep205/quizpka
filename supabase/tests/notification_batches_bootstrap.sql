-- DISPOSABLE EMPTY DATABASE ONLY. Minimal pre-existing schema, not a production migration.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.profiles (
  id uuid primary key references auth.users(id), email text, display_name text,
  role text not null, status text not null
);
create function public.is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;
create function public.is_active_user() returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;
insert into auth.users select ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid
  from generate_series(1,5) i;
insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001','admin@test.invalid','Admin','admin','active'),
  ('00000000-0000-0000-0000-000000000002','alice@test.invalid','Alice','user','active'),
  ('00000000-0000-0000-0000-000000000003','bob@test.invalid','Bob','user','active'),
  ('00000000-0000-0000-0000-000000000004','blocked@test.invalid','Blocked','user','blocked'),
  ('00000000-0000-0000-0000-000000000005','admin2@test.invalid','Admin 2','admin','active');
create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 2000),
  is_direct boolean not null default false, read_at timestamptz,
  created_at timestamptz not null default now(), revoked_at timestamptz
);
alter table public.notifications enable row level security;
grant select, update on public.notifications to authenticated;
grant update (title) on public.notifications to authenticated;
insert into public.notifications (recipient_id,sender_id,title,message,is_direct,read_at,created_at,revoked_at) values
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',
   'Same','Same',false,null,'2026-09-01 00:00:00+00',null),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',
   'Same','Same',false,'2026-09-01 01:00:00+00','2026-09-01 00:00:00+00','2026-09-02 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',
   'Direct','Legacy',true,null,'2026-09-01 00:00:00+00',null);
