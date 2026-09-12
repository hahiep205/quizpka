insert into public.products (id, name, price_vnd, active)
values ('tadv02', '5 Bộ đề quiz ôn tập Tiếng Anh đầu vào mới (TADV02)', 20000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
