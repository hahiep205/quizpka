-- Revert activity-event retention to the newest 3000 rows (user decision
-- 2026-10-04), superseding the 12000 cap set by 20260910100000. Enforces the
-- new cap immediately, then re-points the hourly pg_cron job.

select cron.unschedule('prune-activity-events')
where exists (select 1 from cron.job where jobname = 'prune-activity-events');

select cron.schedule(
  'prune-activity-events',
  '0 * * * *',
  $$select public.prune_activity_events(3000)$$
) where not exists (select 1 from cron.job where jobname = 'prune-activity-events');

select public.prune_activity_events(3000) as deleted_rows;
