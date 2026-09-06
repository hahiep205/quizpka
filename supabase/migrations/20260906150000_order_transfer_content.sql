alter table public.orders add column if not exists transfer_content text;
create unique index if not exists orders_transfer_content_idx on public.orders (transfer_content) where transfer_content is not null;

update public.orders
set transfer_content = 'PAY' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18))
where transfer_content is null;
