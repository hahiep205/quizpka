insert into public.products (id, name, price_vnd, active)
values ('mln102', 'Quiz ôn tập Cuối kỳ - Triết học Mác - Lênin (3 tín chỉ) (MLN102)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
