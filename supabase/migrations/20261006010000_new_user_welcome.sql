-- Existing accounts have already passed the first-login welcome screen.
-- New profile rows receive false after the default is changed below.
alter table public.profiles
  add column if not exists welcome_completed boolean not null default true;

alter table public.profiles
  alter column welcome_completed set default false;

create or replace function public.complete_my_welcome()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles
  set welcome_completed = true
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.complete_my_welcome() from public, anon;
grant execute on function public.complete_my_welcome() to authenticated;
