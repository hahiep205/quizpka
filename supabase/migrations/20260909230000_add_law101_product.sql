insert into public.products (id, name, price_vnd, active)
values ('law101', 'Quiz ôn tập Giữa và Cuối kỳ - Pháp luật đại cương (LAW101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
