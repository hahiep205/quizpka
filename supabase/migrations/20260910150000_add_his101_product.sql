insert into public.products (id, name, price_vnd, active)
values ('his101', 'Quiz ôn tập Cuối kỳ - Lịch sử Đảng Cộng sản Việt Nam (HIS101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
