-- Canonical order schema for SePay checkout and webhook processing.

create table if not exists public.orders (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id),
  amount_vnd integer not null check (amount_vnd > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','canceled')),
  provider_transaction_id text,
  provider_event_id text,
  provider_payload jsonb,
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select to authenticated
  using (public.is_active_user() and auth.uid() = user_id);

create unique index if not exists orders_one_pending_per_product_idx
  on public.orders (user_id, product_id) where status = 'pending';
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create unique index if not exists orders_provider_event_idx
  on public.orders (provider_event_id) where provider_event_id is not null;
create unique index if not exists orders_provider_transaction_idx
  on public.orders (provider_transaction_id) where provider_transaction_id is not null;
