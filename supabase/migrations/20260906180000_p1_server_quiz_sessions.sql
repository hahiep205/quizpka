create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 240),
  status text not null default 'active' check (status in ('active','submitted','expired','abandoned')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_session_questions (
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  position integer not null check (position >= 0),
  question_id text not null,
  correct_index integer,
  accepted_answers text[] not null default '{}',
  primary key (session_id, question_id),
  unique (session_id, position)
);

create index if not exists quiz_sessions_user_status_idx on public.quiz_sessions(user_id, status, created_at desc);
create index if not exists quiz_session_questions_session_idx on public.quiz_session_questions(session_id, position);

alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_questions enable row level security;

create policy "users read own quiz sessions" on public.quiz_sessions
  for select to authenticated using (public.is_active_user() and auth.uid() = user_id);
create policy "users read own quiz session questions" on public.quiz_session_questions
  for select to authenticated using (exists (
    select 1 from public.quiz_sessions s
    where s.id = session_id and public.is_active_user() and s.user_id = auth.uid()
  ));

revoke all on public.quiz_sessions from anon, authenticated;
revoke all on public.quiz_session_questions from anon, authenticated;

create or replace function public.record_verified_attempt(
  p_session_id uuid,
  p_correct integer,
  p_total integer,
  p_duration_seconds integer,
  p_score numeric,
  p_accuracy integer
)
returns public.practice_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.quiz_sessions%rowtype;
  attempt_row public.practice_attempts%rowtype;
begin
  select * into session_row from public.quiz_sessions where id = p_session_id for update;
  if not found then raise exception 'Quiz session not found' using errcode = 'P0002'; end if;
  if p_total <= 0 or p_correct < 0 or p_correct > p_total or p_accuracy < 0 or p_accuracy > 100 or p_duration_seconds < 0 or p_score < 0 then
    raise exception 'Invalid verified result' using errcode = '22023';
  end if;
  if session_row.status = 'submitted' then
    select * into attempt_row from public.practice_attempts where history_id = 'server:' || p_session_id::text limit 1;
    return attempt_row;
  end if;
  if session_row.status <> 'active' then raise exception 'Quiz session is not active' using errcode = 'P0001'; end if;
  update public.quiz_sessions set status = 'submitted', submitted_at = now() where id = p_session_id;
  insert into public.practice_attempts (user_id, history_id, exam_id, subject_id, title, mode, score, correct, total, accuracy, duration_seconds, completed_at, verified, source)
  values (session_row.user_id, 'server:' || p_session_id::text, session_row.exam_id, session_row.subject_id, session_row.exam_id, 'exam', p_score, p_correct, p_total, p_accuracy, p_duration_seconds, now(), true, 'server_verified')
  returning * into attempt_row;
  return attempt_row;
end;
$$;

revoke all on function public.record_verified_attempt(uuid, integer, integer, integer, numeric, integer) from public, anon, authenticated;
grant execute on function public.record_verified_attempt(uuid, integer, integer, integer, numeric, integer) to service_role;
