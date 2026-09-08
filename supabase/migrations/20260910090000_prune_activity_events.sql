-- Keep only the newest activity events. One-time cleanup below retains the
-- latest 3000 rows; the hourly pg_cron job enforces the same cap afterwards.
-- practice_attempts (quiz history) is intentionally untouched.

-- 1) One-time cleanup: delete everything older than the newest 3000 rows.
delete from public.user_activity_events
where id < (
  select min(id) from (
    select id from public.user_activity_events order by id desc limit 3000
  ) keep
);

-- 2) Reusable prune function with a safety floor (never keep fewer than 100).
create or replace function public.prune_activity_events(p_keep integer default 3000)
returns integer
language plpgsql
security definer
set search_path = '' as $$
declare
  v_keep integer := greatest(coalesce(p_keep, 3000), 100);
  v_cutoff bigint;
  v_deleted integer;
begin
  select min(id) into v_cutoff from (
    select e.id from public.user_activity_events e order by e.id desc limit v_keep
  ) keep;
  if v_cutoff is null then
    return 0;
  end if;
  delete from public.user_activity_events where id < v_cutoff;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_activity_events(integer) from public, anon, authenticated;
grant execute on function public.prune_activity_events(integer) to service_role;

-- 3) Hourly enforcement. pg_cron runs this as the scheduler (postgres);
-- the SECURITY DEFINER function performs the delete as table owner.
create extension if not exists pg_cron;
select cron.schedule(
  'prune-activity-events',
  '0 * * * *',
  $$select public.prune_activity_events(3000)$$
) where not exists (select 1 from cron.job where jobname = 'prune-activity-events');
