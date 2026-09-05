-- Numeric constraints and provider event storage for production reconciliation.

alter table public.practice_attempts
  add constraint practice_attempts_correct_nonnegative_check check (correct is null or correct >= 0) not valid,
  add constraint practice_attempts_total_nonnegative_check check (total is null or total >= 0) not valid,
  add constraint practice_attempts_correct_lte_total_check check (correct is null or total is null or correct <= total) not valid,
  add constraint practice_attempts_accuracy_range_check check (accuracy is null or accuracy between 0 and 100) not valid,
  add constraint practice_attempts_duration_nonnegative_check check (duration_seconds is null or duration_seconds >= 0) not valid;

alter table public.user_learning_stats
  add constraint user_learning_stats_attempts_nonnegative_check check (attempts >= 0 and week_attempts >= 0 and month_attempts >= 0) not valid,
  add constraint user_learning_stats_accuracy_range_check check (average_accuracy between 0 and 100 and week_average_accuracy between 0 and 100 and month_average_accuracy between 0 and 100) not valid,
  add constraint user_learning_stats_duration_nonnegative_check check (total_duration_seconds >= 0 and week_total_duration_seconds >= 0 and month_total_duration_seconds >= 0) not valid,
  add constraint user_learning_stats_points_nonnegative_check check (points >= 0 and week_points >= 0 and month_points >= 0) not valid;

alter table public.practice_attempts validate constraint practice_attempts_correct_nonnegative_check;
alter table public.practice_attempts validate constraint practice_attempts_total_nonnegative_check;
alter table public.practice_attempts validate constraint practice_attempts_correct_lte_total_check;
alter table public.practice_attempts validate constraint practice_attempts_accuracy_range_check;
alter table public.practice_attempts validate constraint practice_attempts_duration_nonnegative_check;
alter table public.user_learning_stats validate constraint user_learning_stats_attempts_nonnegative_check;
alter table public.user_learning_stats validate constraint user_learning_stats_accuracy_range_check;
alter table public.user_learning_stats validate constraint user_learning_stats_duration_nonnegative_check;
alter table public.user_learning_stats validate constraint user_learning_stats_points_nonnegative_check;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'sepay',
  event_id text,
  transaction_id text,
  order_id text references public.orders(order_id) on delete set null,
  payload jsonb not null default '{}',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received','processed','rejected','failed')),
  error_message text
);

create unique index if not exists payment_events_provider_event_idx
  on public.payment_events(provider, event_id) where event_id is not null;
create unique index if not exists payment_events_provider_transaction_idx
  on public.payment_events(provider, transaction_id) where transaction_id is not null;
alter table public.payment_events enable row level security;
