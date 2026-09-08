insert into public.products (id, name, price_vnd, active)
values ('phy101', 'Vật lý 1 - Cuối kỳ (PHY101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
