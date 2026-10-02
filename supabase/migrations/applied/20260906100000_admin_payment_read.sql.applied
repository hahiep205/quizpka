drop policy if exists "admin read all orders" on public.orders;
create policy "admin read all orders" on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin read all purchases" on public.purchases;
create policy "admin read all purchases" on public.purchases
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin read all products" on public.products;
create policy "admin read all products" on public.products
  for select to authenticated
  using (public.is_admin());
