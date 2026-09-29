-- Khoa / mo khoa tai khoan kem ly do (hien thi cho user khi login).
alter table public.profiles
  add column if not exists blocked_reason text,
  add column if not exists blocked_at timestamptz;

create or replace function public.admin_set_user_status(p_user_id uuid, p_status text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
  target_role text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'User id is required' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Khong the khoa/mở khoa chinh minh' using errcode = 'P0001';
  end if;
  if p_status not in ('active', 'blocked') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  select role into target_role from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if target_role = 'admin' and p_status = 'blocked' then
    raise exception 'Khong the khoa tai khoan admin' using errcode = 'P0001';
  end if;

  if p_status = 'blocked' then
    if normalized_reason is null then
      raise exception 'Vui long nhap ly do khoa' using errcode = '22023';
    end if;
    if char_length(normalized_reason) > 500 then
      raise exception 'Ly do khoa qua dai (toi da 500 ky tu)' using errcode = '22023';
    end if;
    update public.profiles
    set status = 'blocked',
        blocked_reason = normalized_reason,
        blocked_at = now(),
        updated_at = now()
    where id = p_user_id;
  else
    update public.profiles
    set status = 'active',
        blocked_reason = null,
        blocked_at = null,
        updated_at = now()
    where id = p_user_id;
  end if;

  return (
    select jsonb_build_object(
      'id', p.id,
      'status', p.status,
      'blocked_reason', p.blocked_reason,
      'blocked_at', p.blocked_at
    )
    from public.profiles p
    where p.id = p_user_id
  );
end;
$$;

revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
