insert into public.products (id, name, price_vnd, active)
values
  ('ppt101', 'Đề Phương pháp tính - Giữa kỳ (PPT101)', 10000, true),
  ('ppt102', 'Đề Phương pháp tính - Cuối kỳ (PPT102)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
