create table if not exists public.attempt_submission_outbox (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_retry_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

alter table public.attempt_submission_outbox enable row level security;
create policy "users read own attempt outbox" on public.attempt_submission_outbox
  for select to authenticated using (public.is_active_user() and auth.uid() = user_id);
revoke all on public.attempt_submission_outbox from anon, authenticated;

create or replace function public.refresh_user_verified_stats(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_learning_stats (
    user_id, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points,
    week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points,
    month_subjects_reviewed, month_attempts, month_average_accuracy, month_total_duration_seconds, month_points,
    verified, updated_at
  )
  with verified_attempts as (select * from public.practice_attempts where user_id = p_user_id and verified = true),
  periods as (
    select 'all' as period, * from verified_attempts
    union all select 'week', * from verified_attempts where completed_at >= now() - interval '7 days'
    union all select 'month', * from verified_attempts where date_trunc('month', completed_at) = date_trunc('month', now())
  ),
  aggregate as (
    select period, count(*)::integer attempts, count(distinct subject_id)::integer subjects_reviewed,
      coalesce(round(avg(accuracy)), 0)::integer average_accuracy, coalesce(sum(duration_seconds), 0)::integer total_duration_seconds
    from periods group by period
  ),
  scored as (
    select aggregate.*, round((least(average_accuracy, 100) * 0.5 + least((subjects_reviewed::numeric / 10) * 100, 100) * 0.15 + least((attempts::numeric / 20) * 100, 100) * 0.1 + case when attempts = 0 or total_duration_seconds = 0 then 0 when total_duration_seconds / attempts / 60.0 <= 40 then 25 else greatest(5, 25 - ((total_duration_seconds / attempts / 60.0) - 40) * 0.375) end) * 10)::integer points
    from aggregate
  )
  select p_user_id,
    coalesce(a.subjects_reviewed,0), coalesce(a.attempts,0), coalesce(a.average_accuracy,0), coalesce(a.total_duration_seconds,0), coalesce(a.points,0),
    coalesce(w.subjects_reviewed,0), coalesce(w.attempts,0), coalesce(w.average_accuracy,0), coalesce(w.total_duration_seconds,0), coalesce(w.points,0),
    coalesce(m.subjects_reviewed,0), coalesce(m.attempts,0), coalesce(m.average_accuracy,0), coalesce(m.total_duration_seconds,0), coalesce(m.points,0), true, now()
  from (select 1) x left join scored a on a.period = 'all' left join scored w on w.period = 'week' left join scored m on m.period = 'month'
  on conflict (user_id) do update set
    subjects_reviewed = excluded.subjects_reviewed, attempts = excluded.attempts, average_accuracy = excluded.average_accuracy,
    total_duration_seconds = excluded.total_duration_seconds, points = excluded.points,
    week_subjects_reviewed = excluded.week_subjects_reviewed, week_attempts = excluded.week_attempts, week_average_accuracy = excluded.week_average_accuracy,
    week_total_duration_seconds = excluded.week_total_duration_seconds, week_points = excluded.week_points,
    month_subjects_reviewed = excluded.month_subjects_reviewed, month_attempts = excluded.month_attempts, month_average_accuracy = excluded.month_average_accuracy,
    month_total_duration_seconds = excluded.month_total_duration_seconds, month_points = excluded.month_points, verified = true, updated_at = now();
end;
$$;

revoke all on function public.refresh_user_verified_stats(uuid) from public, anon, authenticated;
grant execute on function public.refresh_user_verified_stats(uuid) to service_role;
