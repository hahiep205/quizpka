create or replace function public.admin_delete_support_report(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  delete from public.support_reports where id = p_report_id;
  return found;
end;
$$;

revoke all on function public.admin_delete_support_report(uuid) from public, anon;
grant execute on function public.admin_delete_support_report(uuid) to authenticated;
