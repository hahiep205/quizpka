-- Run in Supabase SQL editor to enable a shared leaderboard.
create table if not exists public.user_learning_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  visible boolean not null default true,
  subjects_reviewed integer not null default 0,
  attempts integer not null default 0,
  average_accuracy integer not null default 0,
  total_duration_seconds integer not null default 0,
  points integer not null default 0,
  week_subjects_reviewed integer not null default 0,
  week_attempts integer not null default 0,
  week_average_accuracy integer not null default 0,
  week_total_duration_seconds integer not null default 0,
  week_points integer not null default 0,
  month_subjects_reviewed integer not null default 0,
  month_attempts integer not null default 0,
  month_average_accuracy integer not null default 0,
  month_total_duration_seconds integer not null default 0,
  month_points integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_learning_stats enable row level security;

drop policy if exists "read visible learning stats" on public.user_learning_stats;
create policy "read visible learning stats"
  on public.user_learning_stats
  for select
  using (visible = true or auth.uid() = user_id);

drop policy if exists "write own learning stats" on public.user_learning_stats;
create policy "write own learning stats"
  on public.user_learning_stats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
