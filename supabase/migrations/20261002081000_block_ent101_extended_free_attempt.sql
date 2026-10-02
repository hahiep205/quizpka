-- Block ENT101 on the extended free-attempt RPC used by current clients.
alter function public.submit_free_attempt(
  text, text, text, text, text, numeric, integer, integer, integer, integer,
  text, integer, jsonb, text, text, text, jsonb
) rename to submit_free_attempt_extended_without_ent101;

revoke all on function public.submit_free_attempt_extended_without_ent101(
  text, text, text, text, text, numeric, integer, integer, integer, integer,
  text, integer, jsonb, text, text, text, jsonb
) from public, anon, authenticated;

create function public.submit_free_attempt(
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
  p_retry_number integer,
  p_setup jsonb default null,
  p_lang text default null,
  p_chapter_id text default null,
  p_toeic_scope text default null,
  p_wrong_questions jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_subject_id = 'ky-nang-khoi-nghiep-va-lanh-dao'
    or p_exam_id = 'entrepreneurship-leadership-final-bank-1' then
    raise exception 'Paid quiz must use a verified session' using errcode = 'P0001';
  end if;

  return public.submit_free_attempt_extended_without_ent101(
    p_history_id, p_exam_id, p_subject_id, p_title, p_mode, p_score,
    p_correct, p_total, p_accuracy, p_duration_seconds, p_retry_of, p_retry_number,
    p_setup, p_lang, p_chapter_id, p_toeic_scope, p_wrong_questions
  );
end;
$$;

revoke all on function public.submit_free_attempt(
  text, text, text, text, text, numeric, integer, integer, integer, integer,
  text, integer, jsonb, text, text, text, jsonb
) from public, anon;
grant execute on function public.submit_free_attempt(
  text, text, text, text, text, numeric, integer, integer, integer, integer,
  text, integer, jsonb, text, text, text, jsonb
) to authenticated;
