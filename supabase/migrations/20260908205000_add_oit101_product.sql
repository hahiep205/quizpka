insert into public.products (id, name, price_vnd, active)
values ('oit101', 'Tin học văn phòng (OIT101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
