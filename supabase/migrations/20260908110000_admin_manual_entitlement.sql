-- Allow admins to repair a missing paid-course entitlement without exposing table writes to clients.
create or replace function public.admin_grant_purchase(p_user_id uuid, p_product_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  was_granted boolean;
  manual_order_id text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and status = 'active') then
    raise exception 'Active user not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and active = true) then
    raise exception 'Active product not found' using errcode = 'P0002';
  end if;

  select exists (select 1 from public.purchases where user_id = p_user_id and product_id = p_product_id and status = 'paid') into was_granted;
  manual_order_id := 'admin_manual_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.purchases (user_id, product_id, order_id, status, paid_at)
  values (p_user_id, p_product_id, manual_order_id, 'paid', now())
  on conflict (user_id, product_id) do update set status = 'paid', paid_at = now();
  return jsonb_build_object('ok', true, 'already_granted', was_granted);
end;
$$;

revoke all on function public.admin_grant_purchase(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_grant_purchase(uuid, text) to authenticated;
