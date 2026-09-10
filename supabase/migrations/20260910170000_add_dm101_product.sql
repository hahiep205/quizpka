insert into public.products (id, name, price_vnd, active)
values ('dm101', 'Đề Toán rời rạc - Cuối kỳ (DM101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
