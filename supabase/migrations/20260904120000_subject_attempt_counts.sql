create table if not exists public.subject_attempt_counts (
  subject_id text primary key,
  attempt_count bigint not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.subject_attempt_counts enable row level security;

drop policy if exists "Anyone can read subject attempt counts" on public.subject_attempt_counts;
create policy "Anyone can read subject attempt counts"
  on public.subject_attempt_counts
  for select
  to anon, authenticated
  using (true);

create or replace function public.increment_subject_attempt(p_subject_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  if p_subject_id is null or length(trim(p_subject_id)) = 0 then
    raise exception 'subject_id required';
  end if;

  insert into public.subject_attempt_counts as counts (subject_id, attempt_count)
  values (trim(p_subject_id), 1)
  on conflict (subject_id)
  do update set
    attempt_count = counts.attempt_count + 1,
    updated_at = now()
  returning counts.attempt_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_subject_attempt(text) from public;
grant execute on function public.increment_subject_attempt(text) to anon, authenticated;
grant select on table public.subject_attempt_counts to anon, authenticated;
