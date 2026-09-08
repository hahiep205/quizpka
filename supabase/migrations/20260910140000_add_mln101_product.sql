insert into public.products (id, name, price_vnd, active)
values ('mln101', 'Quiz ôn tập Cuối kỳ - Triết học Mác - Lênin (2 tín chỉ) (MLN101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
