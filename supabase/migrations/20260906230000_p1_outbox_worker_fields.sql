alter table public.attempt_submission_outbox add column if not exists locked_at timestamptz;
alter table public.attempt_submission_outbox add column if not exists completed_at timestamptz;
create index if not exists attempt_outbox_ready_idx on public.attempt_submission_outbox(status, next_retry_at);
