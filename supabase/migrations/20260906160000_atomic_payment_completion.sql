-- Atomically transition an order to paid and grant its entitlement.

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
declare
  target public.orders%rowtype;
begin
  select * into target from public.orders where order_id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if target.status in ('canceled', 'refunded', 'failed') then
    raise exception 'Order state conflict' using errcode = 'P0001';
  end if;

  if target.status = 'pending' then
    update public.orders set
      status = 'paid', paid_at = now(),
      provider_transaction_id = nullif(p_transaction_id, ''),
      provider_event_id = nullif(p_event_id, ''),
      provider_payload = p_payload, updated_at = now()
    where order_id = p_order_id;
  end if;

  insert into public.purchases (user_id, product_id, order_id, status, paid_at)
  values (target.user_id, target.product_id, target.order_id, 'paid', coalesce(target.paid_at, now()))
  on conflict (user_id, product_id) do update set
    order_id = excluded.order_id, status = 'paid', paid_at = excluded.paid_at;

  return jsonb_build_object('ok', true, 'duplicate', target.status = 'paid');
end;
$$;

revoke all on function public.complete_paid_order(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_paid_order(text, text, text, jsonb) to service_role;
