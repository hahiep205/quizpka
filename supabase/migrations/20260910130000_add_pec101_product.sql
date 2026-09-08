insert into public.products (id, name, price_vnd, active)
values ('pec101', 'Quiz ôn tập Cuối kỳ - Kinh tế chính trị Mác - Lênin (PEC101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
