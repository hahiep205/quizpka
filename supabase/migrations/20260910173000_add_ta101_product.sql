insert into public.products (id, name, price_vnd, active)
values ('ta101', 'Quiz ôn tập Cuối kỳ - Tiếng Anh 1 (TA101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
