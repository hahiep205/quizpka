insert into public.products (id, name, price_vnd, active)
values ('rm101', 'Quiz ôn tập Cuối kỳ - Phương pháp nghiên cứu khoa học (RM101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
