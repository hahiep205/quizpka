-- Serialize client-reported submissions per user before checking rate limits.

create or replace function public.submit_free_attempt(
  p_history_id text,
  p_exam_id text,
  p_subject_id text,
  p_title text,
  p_mode text,
  p_score numeric,
  p_correct integer,
  p_total integer,
  p_accuracy integer,
  p_duration_seconds integer,
  p_retry_of text,
  p_retry_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hour_count integer;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  if p_history_id is null or char_length(p_history_id) < 1 or char_length(p_history_id) > 100 then
    raise exception 'Invalid history id';
  end if;
  if p_exam_id is null or char_length(p_exam_id) < 1 or char_length(p_exam_id) > 120
    or p_subject_id is null or char_length(p_subject_id) < 1 or char_length(p_subject_id) > 120 then
    raise exception 'Invalid exam reference';
  end if;
  if p_mode not in ('practice', 'exam', 'hard') then
    raise exception 'Invalid mode';
  end if;
  if p_title is not null and char_length(p_title) > 200 then
    raise exception 'Invalid title';
  end if;
  if p_retry_of is not null and char_length(p_retry_of) > 100 then
    raise exception 'Invalid retry reference';
  end if;
  if p_retry_number is not null and (p_retry_number < 1 or p_retry_number > 1000) then
    raise exception 'Invalid retry number';
  end if;
  if p_total is null or p_total <= 0 or p_total > 1000 then
    raise exception 'Invalid total';
  end if;
  if p_correct is null or p_correct < 0 or p_correct > p_total then
    raise exception 'Invalid correct';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'Invalid accuracy';
  end if;
  if p_score is null or p_score < 0 or p_score > 1000 then
    raise exception 'Invalid score';
  end if;
  if p_duration_seconds is null or p_duration_seconds < 0 or p_duration_seconds > 86400 then
    raise exception 'Invalid duration';
  end if;

  if exists (
    select 1 from public.practice_attempts
    where user_id = auth.uid() and history_id = p_history_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  if exists (
    select 1 from public.practice_attempts
    where user_id = auth.uid() and completed_at > now() - interval '10 seconds'
  ) then
    raise exception 'Too many submissions' using errcode = 'P0001';
  end if;

  select count(*) into v_hour_count
  from public.practice_attempts
  where user_id = auth.uid() and completed_at > now() - interval '1 hour';
  if v_hour_count >= 100 then
    raise exception 'Hourly submission limit reached' using errcode = 'P0001';
  end if;

  insert into public.practice_attempts
    (user_id, history_id, exam_id, subject_id, title, mode, score, correct, total, accuracy,
     duration_seconds, retry_of, retry_number, completed_at, verified, source)
  values
    (auth.uid(), p_history_id, p_exam_id, p_subject_id, left(coalesce(p_title, ''), 200), p_mode,
     p_score, p_correct, p_total, p_accuracy, p_duration_seconds,
     nullif(p_retry_of, ''), p_retry_number, now(), false, 'client_reported')
  on conflict (user_id, history_id) do nothing;

  if not found then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;

revoke all on function public.submit_free_attempt(text, text, text, text, text, numeric, integer, integer, integer, integer, text, integer) from public, anon;
grant execute on function public.submit_free_attempt(text, text, text, text, text, numeric, integer, integer, integer, integer, text, integer) to authenticated;
