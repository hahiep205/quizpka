-- Log khi tai khoan bị chặn mở app và nhìn thấy màn hình lý do khóa.
-- Riêng với user_activity_events (chỉ cho active user insert), bảng này cho phép
-- chính blocked user insert 1 dòng "đã xem" để admin biết họ đã đọc lý do chưa.
create table if not exists public.blocked_account_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.blocked_account_views enable row level security;

grant select, insert on public.blocked_account_views to authenticated;

drop policy if exists "users insert own blocked view" on public.blocked_account_views;
create policy "users insert own blocked view"
  on public.blocked_account_views
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own blocked views" on public.blocked_account_views;
create policy "users read own blocked views"
  on public.blocked_account_views
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "admin read all blocked views" on public.blocked_account_views;
create policy "admin read all blocked views"
  on public.blocked_account_views
  for select
  to authenticated
  using (public.is_admin());

create index if not exists blocked_account_views_user_id_idx
  on public.blocked_account_views (user_id, created_at desc);
