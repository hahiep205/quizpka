-- Fix: admin thấy "(chưa đặt tên)" + mất avatar vì profiles.display_name /
-- avatar_url NULL. Cột này chỉ được ghi lúc signup bởi trigger
-- on_auth_user_created -> handle_new_user(), mà trigger/function này chưa
-- từng có migration (chỉ tồn tại trên live DB) nên user tạo lúc trigger
-- thiếu/hỏng bị NULL vĩnh viễn, không gì backfill.
--
-- Migration này:
--  1. Dựng lại function + trigger (idempotent), thêm fallback 'picture'
--     cho avatar (một số tài khoản Google không có avatar_url).
--  2. Trigger thêm AFTER UPDATE để lần login sau tự lấp NULL còn sót
--     (function chỉ lấp ô NULL, không bao giờ ghi đè tên user đã đặt).
--  3. Backfill 1 lần cho toàn bộ row NULL từ auth.users.raw_user_meta_data.
-- Chạy trong Supabase SQL editor. Idempotent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(
      public.profiles.display_name,
      excluded.display_name
    ),
    avatar_url = coalesce(
      public.profiles.avatar_url,
      excluded.avatar_url
    ),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tự chữa: mỗi lần Supabase cập nhật metadata lúc login, lấp NULL còn sót.
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- Backfill 1 lần cho các row đang NULL.
update public.profiles p
set
  display_name = coalesce(
    p.display_name,
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', '')
  ),
  avatar_url = coalesce(
    p.avatar_url,
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', '')
  ),
  updated_at = now()
from auth.users u
where p.id = u.id
  and (p.display_name is null or p.avatar_url is null);
