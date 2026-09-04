-- P0 /admin: cho phép role=admin đọc toàn bộ profiles + user_learning_stats.
-- Chạy trong Supabase SQL editor. Idempotent.

-- profiles: admin đọc tất cả (user thường vẫn chỉ đọc/sửa row của mình nếu đã có policy cũ)
drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'admin'
    )
  );

-- user_learning_stats: admin đọc tất cả để làm /admin
drop policy if exists "admin read all learning stats" on public.user_learning_stats;
create policy "admin read all learning stats"
  on public.user_learning_stats
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'admin'
    )
  );
