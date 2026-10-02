-- Paid subject: Project Management Skills (PM101), 10000 VND.
insert into public.products (id, name, price_vnd, active)
values ('pm101', 'Quiz ôn tập - Kỹ năng Quản lý Dự án (PM101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;
