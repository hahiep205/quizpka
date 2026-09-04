-- Month leaderboard aggregates on user_learning_stats.
alter table public.user_learning_stats
  add column if not exists month_subjects_reviewed integer not null default 0,
  add column if not exists month_attempts integer not null default 0,
  add column if not exists month_average_accuracy integer not null default 0,
  add column if not exists month_total_duration_seconds integer not null default 0,
  add column if not exists month_points integer not null default 0;
