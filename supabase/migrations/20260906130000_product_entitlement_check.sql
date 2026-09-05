-- Centralize paid-product entitlement checks for authenticated active users.

create or replace function public.has_product_access(p_product_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_active_user()
    and p_product_id is not null
    and exists (
      select 1 from public.purchases
      where user_id = auth.uid()
        and product_id = p_product_id
        and status = 'paid'
    );
$$;

revoke all on function public.has_product_access(text) from public, anon;
grant execute on function public.has_product_access(text) to authenticated, service_role;
