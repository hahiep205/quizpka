insert into public.products (id, name, price_vnd, active)
values ('sec301', 'Bảo mật ứng dụng và hệ thống (SEC301)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
