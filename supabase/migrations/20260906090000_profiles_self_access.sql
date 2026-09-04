-- Fix: cho phép mỗi user đọc + sửa row profiles của chính mình.
-- Lý do: policy "admin read all profiles" (migration trước) tự tham chiếu
-- bảng profiles. Khi chưa có policy "đọc row của mình", câu EXISTS con
-- không bao giờ đúng -> loadProfile trong AuthProvider lỗi -> app dùng
-- fallback role='user' -> /admin báo "Không có quyền truy cập" dù DB đã là admin.
-- Chạy trong Supabase SQL editor. Idempotent.

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
