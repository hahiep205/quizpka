create table if not exists public.products (
  id text primary key,
  name text not null,
  price_vnd integer not null check (price_vnd >= 0),
  active boolean not null default true
);
insert into public.products (id, name, price_vnd) values ('dsai101', 'Khoa học dữ liệu và Trí tuệ nhân tạo (DSAI101)', 10000) on conflict (id) do update set price_vnd = excluded.price_vnd, name = excluded.name;
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id), order_id text unique not null, paid_at timestamptz not null default now(), status text not null default 'paid' check (status in ('paid','refunded')),
  unique(user_id, product_id)
);
create table if not exists public.orders (
  order_id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id), amount_vnd integer not null, status text not null default 'pending', created_at timestamptz not null default now()
);
alter table public.products enable row level security; alter table public.purchases enable row level security;
alter table public.orders enable row level security;
create policy "products readable" on public.products for select using (active = true);
create policy "users read own purchases" on public.purchases for select using (auth.uid() = user_id);
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id);
