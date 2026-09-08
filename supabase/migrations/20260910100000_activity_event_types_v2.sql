-- Extend the activity event catalogue for detailed user-behavior logging and
-- raise the retention cap: the new streams roughly double daily volume, so
-- 12000 rows keep about 1.5-2 days visible instead of a few hours.
alter table public.user_activity_events
  drop constraint if exists user_activity_events_event_type_check;
alter table public.user_activity_events
  add constraint user_activity_events_event_type_check check (
    event_type = any (array[
      'login', 'view_dashboard', 'open_exam', 'start_attempt',
      'submit_attempt', 'retry_wrong', 'view_leaderboard', 'update_profile',
      'devtools_attempt', 'abandon_attempt', 'purchase_start', 'purchase_success',
      'search_exam', 'view_notifications', 'read_notification', 'view_exam_detail'
    ])
  );

select cron.unschedule('prune-activity-events');
select cron.schedule(
  'prune-activity-events',
  '0 * * * *',
  $$select public.prune_activity_events(12000)$$
) where not exists (select 1 from cron.job where jobname = 'prune-activity-events');
