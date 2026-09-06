alter table public.support_reports
  add column if not exists type text not null default 'report';

alter table public.support_reports
  drop constraint if exists support_reports_type_check;

alter table public.support_reports
  add constraint support_reports_type_check check (type in ('report','contribute','feedback'));

create or replace function public.submit_support_report(p_type text, p_subject text, p_description text, p_page_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare report_id uuid;
begin
  if not public.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  if p_type not in ('report','contribute','feedback') then raise exception 'Invalid support type'; end if;
  insert into public.support_reports(user_id, type, subject, description, page_url)
  values (auth.uid(), p_type, trim(p_subject), trim(p_description), nullif(trim(p_page_url), ''))
  returning id into report_id;
  return report_id;
end; $$;

revoke all on function public.submit_support_report(text,text,text,text) from public, anon;
grant execute on function public.submit_support_report(text,text,text,text) to authenticated;
