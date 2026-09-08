insert into public.products (id, name, price_vnd, active)
values ('hcm101', 'Quiz ôn tập Cuối kỳ - Tư tưởng Hồ Chí Minh (HCM101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
