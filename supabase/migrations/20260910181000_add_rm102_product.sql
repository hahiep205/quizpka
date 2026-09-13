insert into public.products (id, name, price_vnd, active)
values ('rm102', 'Quiz ôn tập Cuối kỳ - Nghiên cứu khoa học trong kinh tế (RM102)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
