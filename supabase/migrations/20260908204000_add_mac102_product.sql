insert into public.products (id, name, price_vnd, active)
values ('mac102', 'Kinh tế vĩ mô (MAC102)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
