-- Prevent users from changing authorization fields on their own profile.
-- Profile changes must go through the narrowly-scoped RPC below.

drop policy if exists "users update own profile" on public.profiles;

create or replace function public.update_my_profile(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(p_display_name), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if normalized_name is not null and char_length(normalized_name) > 120 then
    raise exception 'Display name is too long' using errcode = '22023';
  end if;

  update public.profiles
  set display_name = normalized_name
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return (
    select jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'role', p.role,
      'status', p.status
    )
    from public.profiles p
    where p.id = current_user_id
  );
end;
$$;

revoke all on function public.update_my_profile(text) from public;
grant execute on function public.update_my_profile(text) to authenticated;
