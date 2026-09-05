-- Session lifecycle support for resume and server-side expiry.

create index if not exists quiz_sessions_user_active_idx
  on public.quiz_sessions(user_id, status, expires_at);
