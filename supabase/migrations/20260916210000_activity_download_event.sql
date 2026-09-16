-- Allow logging PDF downloads from /dashboard/downloads.
-- Shown as history on /admin/downloads. Retention/prune job unchanged.
alter table public.user_activity_events
  drop constraint if exists user_activity_events_event_type_check;
alter table public.user_activity_events
  add constraint user_activity_events_event_type_check check (
    event_type = any (array[
      'login', 'view_dashboard', 'open_exam', 'start_attempt',
      'submit_attempt', 'retry_wrong', 'view_leaderboard', 'update_profile',
      'devtools_attempt', 'abandon_attempt', 'purchase_start', 'purchase_success',
      'search_exam', 'view_notifications', 'read_notification', 'view_exam_detail',
      'download_pdf'
    ])
  );
