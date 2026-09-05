-- Never expose server-side answer keys through PostgREST.

drop policy if exists "users read own quiz session questions" on public.quiz_session_questions;
revoke all on public.quiz_session_questions from anon, authenticated;
