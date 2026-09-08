insert into public.products (id, name, price_vnd, active)
values
  ('dst101', 'Đề Đại số tuyến tính - Cuối kỳ (DST101)', 10000, true),
  ('xst101', 'Đề Xác suất thống kê - Giữa kỳ (XST101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
