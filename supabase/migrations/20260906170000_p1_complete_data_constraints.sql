-- Complete numeric constraints for the legacy tables after the production audit.

alter table public.practice_attempts
  add constraint practice_attempts_score_nonnegative_check check (score is null or score >= 0) not valid;

alter table public.user_learning_stats
  add constraint user_learning_stats_subjects_nonnegative_check check (subjects_reviewed >= 0 and week_subjects_reviewed >= 0 and month_subjects_reviewed >= 0) not valid;

alter table public.practice_attempts validate constraint practice_attempts_score_nonnegative_check;
alter table public.user_learning_stats validate constraint user_learning_stats_subjects_nonnegative_check;
