alter table public.quiz_sessions add column if not exists idempotency_key text;
alter table public.quiz_sessions add column if not exists result jsonb;
alter table public.quiz_sessions add column if not exists last_seen_at timestamptz;
create unique index if not exists quiz_sessions_user_idempotency_idx on public.quiz_sessions(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists quiz_sessions_active_expiry_idx on public.quiz_sessions(expires_at) where status = 'active';
