insert into public.products (id, name, price_vnd, active)
values ('eco101', 'Quiz ôn tập Giữa và Cuối kỳ - Kinh tế học (ECO101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
