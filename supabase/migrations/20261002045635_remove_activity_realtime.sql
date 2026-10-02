-- Activity is audit data, not a latency-sensitive notification stream.
do $$
begin
  execute 'alter publication supabase_realtime drop table public.user_activity_events';
exception when undefined_object then
  null;
end $$;
