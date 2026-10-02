-- Paid subject: Entrepreneurship and Leadership Skills (ENT101), 10000 VND.
insert into public.products (id, name, price_vnd, active)
values ('ent101', 'Quiz ôn tập - Kỹ năng Khởi nghiệp và Lãnh đạo (ENT101)', 10000, true)
on conflict (id) do update set name = excluded.name, price_vnd = excluded.price_vnd, active = excluded.active;

-- Preserve the current free-attempt implementation behind a private wrapper so
-- ENT101 can no longer submit client-reported results after becoming paid.
alter function public.submit_free_attempt(text, text, text, text, text, numeric, integer, integer, integer, integer, text, integer)
  rename to submit_free_attempt_without_ent101;

revoke all on function public.submit_free_attempt_without_ent101(text, text, text, text, text, numeric, integer, integer, integer, integer, text, integer)
  from public, anon, authenticated;

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
  p_retry_number integer
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

  return public.submit_free_attempt_without_ent101(
    p_history_id, p_exam_id, p_subject_id, p_title, p_mode, p_score,
    p_correct, p_total, p_accuracy, p_duration_seconds, p_retry_of, p_retry_number
  );
end;
$$;

revoke all on function public.submit_free_attempt(text, text, text, text, text, numeric, integer, integer, integer, integer, text, integer)
  from public, anon;
grant execute on function public.submit_free_attempt(text, text, text, text, text, numeric, integer, integer, integer, integer, text, integer)
  to authenticated;
