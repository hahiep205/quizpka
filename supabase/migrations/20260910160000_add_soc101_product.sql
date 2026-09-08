insert into public.products (id, name, price_vnd, active)
values ('soc101', 'Quiz ôn tập Cuối kỳ - Chủ nghĩa xã hội khoa học (SOC101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
