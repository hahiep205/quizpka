-- Phase 3: quota and sanitization boundary for client activity events.

create or replace function public.record_activity_event(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  if p_event_type is null or char_length(p_event_type) > 40 then
    raise exception 'Invalid activity event';
  end if;
  if coalesce(jsonb_typeof(p_metadata), 'object') <> 'object'
     or pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 2048 then
    raise exception 'Invalid activity metadata';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 1));

  if (select count(*) from public.user_activity_events
      where user_id = v_user_id and created_at > now() - interval '10 minutes') >= 100 then
    raise exception 'Activity quota exceeded' using errcode = 'P0001';
  end if;
  if (select count(*) from public.user_activity_events
      where user_id = v_user_id and created_at > now() - interval '1 day') >= 1000 then
    raise exception 'Daily activity quota exceeded' using errcode = 'P0001';
  end if;

  insert into public.user_activity_events(user_id, event_type, metadata)
  values (v_user_id, p_event_type, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.record_activity_event(text, jsonb) from public, anon;
grant execute on function public.record_activity_event(text, jsonb) to authenticated;

revoke insert on public.user_activity_events from authenticated;
