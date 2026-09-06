insert into public.products (id, name, price_vnd, active)
values ('sqa101', 'Đánh giá và kiểm định chất lượng phần mềm (SQA101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
