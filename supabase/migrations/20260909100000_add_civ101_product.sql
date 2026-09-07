insert into public.products (id, name, price_vnd, active)
values ('civ101', 'Quiz ôn tập Giữa và Cuối kỳ - Lịch sử văn minh thế giới (CIV101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
