-- P3/P4 hardening: RPC privileges, trigger search_path, indexes and order expiry.

alter table public.orders
  add column if not exists expires_at timestamptz;

update public.orders
set expires_at = created_at + interval '15 minutes'
where expires_at is null;

alter table public.orders
  alter column expires_at set default (now() + interval '15 minutes');

create index if not exists notifications_sender_id_idx on public.notifications(sender_id);
create index if not exists orders_product_id_idx on public.orders(product_id);
create index if not exists payment_events_order_id_idx on public.payment_events(order_id);
create index if not exists purchases_product_id_idx on public.purchases(product_id);
create index if not exists support_reports_user_id_idx on public.support_reports(user_id);
create index if not exists orders_pending_expiry_idx on public.orders(expires_at) where status = 'pending';

-- The extended overload is the one reported executable by anon. It is only
-- called by the authenticated frontend and must never be an anonymous write RPC.
revoke all on function public.submit_free_attempt(
  text, text, text, text, text, numeric, integer, integer, integer, integer,
  text, integer, jsonb, text, text, text, jsonb
) from public, anon;
grant execute on function public.submit_free_attempt(
  text, text, text, text, text, numeric, integer, integer, integer, integer,
  text, integer, jsonb, text, text, text, jsonb
) to authenticated;

alter function public.increment_practice_attempt_counter()
  set search_path = public;

-- Replace direct auth calls in high-volume policies with initplan-safe forms.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "users read own activity" on public.user_activity_events;
create policy "users read own activity" on public.user_activity_events
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);
drop policy if exists "users read own attempts" on public.practice_attempts;
create policy "users read own attempts" on public.practice_attempts
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);
drop policy if exists "users read own purchases" on public.purchases;
create policy "users read own purchases" on public.purchases
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);
drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);

create or replace function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.orders
  set status = 'canceled', updated_at = now()
  where status = 'pending' and expires_at is not null and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.expire_pending_orders() from public, anon, authenticated;
grant execute on function public.expire_pending_orders() to service_role;

create or replace function public.complete_paid_order(
  p_order_id text,
  p_transaction_id text,
  p_event_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target public.orders%rowtype;
begin
  select * into target from public.orders where order_id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if target.status in ('canceled', 'refunded', 'failed') then
    raise exception 'Order state conflict' using errcode = 'P0001';
  end if;
  if target.status = 'pending' and target.expires_at is not null and target.expires_at <= now() then
    update public.orders set status = 'canceled', updated_at = now() where order_id = p_order_id;
    raise exception 'Order expired' using errcode = 'P0001';
  end if;
  if target.status = 'pending' then
    update public.orders set status = 'paid', paid_at = now(),
      provider_transaction_id = nullif(p_transaction_id, ''),
      provider_event_id = nullif(p_event_id, ''), provider_payload = p_payload,
      updated_at = now() where order_id = p_order_id;
  end if;
  insert into public.purchases (user_id, product_id, order_id, status, paid_at)
  values (target.user_id, target.product_id, target.order_id, 'paid', coalesce(target.paid_at, now()))
  on conflict (user_id, product_id) do update set order_id = excluded.order_id,
    status = 'paid', paid_at = excluded.paid_at;
  return jsonb_build_object('ok', true, 'duplicate', target.status = 'paid');
end;
$$;
revoke all on function public.complete_paid_order(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_paid_order(text, text, text, jsonb) to service_role;
