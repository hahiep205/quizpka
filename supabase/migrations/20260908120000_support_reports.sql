create table if not exists public.support_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  description text not null check (char_length(description) between 1 and 4000),
  page_url text,
  status text not null default 'pending' check (status in ('pending','resolved','unresolvable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_reports enable row level security;
create index if not exists support_reports_created_idx on public.support_reports(created_at desc);
create policy "users read own support reports" on public.support_reports for select to authenticated using (public.is_active_user() and auth.uid() = user_id);
create policy "admins read all support reports" on public.support_reports for select to authenticated using (public.is_admin());

create or replace function public.submit_support_report(p_subject text, p_description text, p_page_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare report_id uuid;
begin
  if not public.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  insert into public.support_reports(user_id, subject, description, page_url) values (auth.uid(), trim(p_subject), trim(p_description), nullif(trim(p_page_url), '')) returning id into report_id;
  return report_id;
end; $$;
revoke all on function public.submit_support_report(text,text,text) from public, anon;
grant execute on function public.submit_support_report(text,text,text) to authenticated;

create or replace function public.admin_update_support_status(p_report_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_status not in ('pending','resolved','unresolvable') then raise exception 'Invalid support status'; end if;
  update public.support_reports set status = p_status, updated_at = now() where id = p_report_id;
end; $$;
revoke all on function public.admin_update_support_status(uuid,text) from public, anon;
grant execute on function public.admin_update_support_status(uuid,text) to authenticated;
