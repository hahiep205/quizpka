-- Admin realtime: stream inserts on activity + attempts tables to /admin.
-- Without this, the admin postgres_changes subscriptions never fire and the
-- pages only show data up to the last manual reload.
alter publication supabase_realtime add table public.user_activity_events;
alter publication supabase_realtime add table public.practice_attempts;
