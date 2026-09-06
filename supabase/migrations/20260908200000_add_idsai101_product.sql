insert into public.products (id, name, price_vnd, active)
values ('idsai101', 'Nhập môn Khoa học dữ liệu và Trí tuệ nhân tạo (IDSAI101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
