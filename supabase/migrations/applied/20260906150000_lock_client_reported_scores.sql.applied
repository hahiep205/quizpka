-- Client-reported attempts and aggregates are legacy/unverified data.

alter table public.practice_attempts add column if not exists verified boolean not null default false;
alter table public.practice_attempts add column if not exists source text not null default 'client_reported'
  check (source in ('client_reported','server_verified'));
alter table public.user_learning_stats add column if not exists verified boolean not null default false;

update public.practice_attempts set verified = false, source = 'client_reported'
where verified is distinct from false or source is distinct from 'client_reported';
update public.user_learning_stats set verified = false where verified is distinct from false;

drop policy if exists "users insert own attempts" on public.practice_attempts;
drop policy if exists "write own learning stats" on public.user_learning_stats;

drop policy if exists "read visible learning stats" on public.user_learning_stats;
create policy "read visible verified learning stats" on public.user_learning_stats
  for select to authenticated
  using (public.is_active_user() and verified = true and (visible = true or auth.uid() = user_id));

create index if not exists practice_attempts_verified_time_idx
  on public.practice_attempts (verified, completed_at desc);
create index if not exists user_learning_stats_verified_points_idx
  on public.user_learning_stats (verified, points desc);
