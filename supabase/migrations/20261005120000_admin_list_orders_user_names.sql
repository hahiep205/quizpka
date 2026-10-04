-- admin_list_orders: trả kèm tên + email của user (trước đây thiếu join
-- profiles nên trang Admin/Payment luôn hiện "(chưa đặt tên)" + user_id).
-- Fix bug report 05/10/2026. Signature giữ nguyên -> ACL revoke/grant của
-- 20261004100200 vẫn có hiệu lực, không cần cấp lại.
--
-- Phòng thủ thêm: một số profiles cũ có cả display_name lẫn email NULL
-- (trigger handle_new_user từng thiếu). Fallback sang auth.users.email
-- (security definer đọc được) để cột User không bao giờ trống khi Auth có email.

create or replace function public.admin_list_orders(
  p_since timestamptz default null,
  p_limit integer default 500
) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := coalesce(p_since, now() - interval '24 hours');
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 1000));
  v_items jsonb;
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  select count(*) into v_total from public.orders o where o.created_at >= v_since;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_items
  from (
    select o.order_id, o.user_id, o.product_id, coalesce(pr.name, o.product_id) as product_name,
      coalesce(nullif(p.display_name, ''), p.email, u.email) as user_display_name,
      coalesce(p.email, u.email) as user_email,
      o.amount_vnd, o.currency, o.status, o.provider_transaction_id, o.paid_at, o.created_at
    from public.orders o
    left join public.products pr on pr.id = o.product_id
    left join public.profiles p on p.id = o.user_id
    left join auth.users u on u.id = o.user_id
    where o.created_at >= v_since
    order by o.created_at desc, o.order_id desc
    limit v_limit
  ) t;
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;
