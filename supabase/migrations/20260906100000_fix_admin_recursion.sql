-- Fix infinite recursion (42P17) trên bảng profiles.
-- Nguyên nhân: policy "admin read all ..." dùng EXISTS (select ... from profiles)
-- ngay trên chính bảng profiles -> PostgREST đánh giá policy lồng nhau vô hạn.
-- Cách fix chuẩn: gom logic check admin vào 1 hàm SECURITY DEFINER
-- (chạy với quyền owner, bypass RLS nên không đệ quy), policy chỉ gọi hàm.
-- Chạy trong Supabase SQL editor. Idempotent.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- profiles
drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- user_learning_stats (migration P0)
drop policy if exists "admin read all learning stats" on public.user_learning_stats;
create policy "admin read all learning stats"
  on public.user_learning_stats
  for select
  to authenticated
  using (public.is_admin());

-- user_activity_events (migration P2)
drop policy if exists "admin read all activity" on public.user_activity_events;
create policy "admin read all activity"
  on public.user_activity_events
  for select
  to authenticated
  using (public.is_admin());

-- practice_attempts (migration P2)
drop policy if exists "admin read all attempts" on public.practice_attempts;
create policy "admin read all attempts"
  on public.practice_attempts
  for select
  to authenticated
  using (public.is_admin());
