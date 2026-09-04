-- P2 /admin timeline: log mọi luồng hoạt động của user sau khi active
-- + mirror lịch sử làm bài từ localStorage lên server để admin xem được.
-- Chạy trong Supabase SQL editor. Idempotent.

-- 1) Bảng sự kiện hoạt động
create table if not exists public.user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'login', 'view_dashboard', 'open_exam', 'start_attempt',
    'submit_attempt', 'retry_wrong', 'view_leaderboard', 'update_profile'
  )),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_user_time_idx
  on public.user_activity_events (user_id, created_at desc);
create index if not exists user_activity_events_type_time_idx
  on public.user_activity_events (event_type, created_at desc);

alter table public.user_activity_events enable row level security;

-- user chỉ insert + đọc row của chính mình
drop policy if exists "users insert own activity" on public.user_activity_events;
create policy "users insert own activity"
  on public.user_activity_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own activity" on public.user_activity_events;
create policy "users read own activity"
  on public.user_activity_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- admin đọc tất cả
drop policy if exists "admin read all activity" on public.user_activity_events;
create policy "admin read all activity"
  on public.user_activity_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'admin'
    )
  );

-- 2) Bảng mirror lịch sử làm bài (đồng bộ từ localStorage sau mỗi lần nộp bài)
create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  history_id text not null,
  exam_id text,
  subject_id text,
  title text,
  mode text,
  score numeric,
  correct integer,
  total integer,
  accuracy integer,
  duration_seconds integer,
  retry_of text,
  retry_number integer,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, history_id)
);

create index if not exists practice_attempts_user_time_idx
  on public.practice_attempts (user_id, completed_at desc);
create index if not exists practice_attempts_subject_time_idx
  on public.practice_attempts (subject_id, completed_at desc);

alter table public.practice_attempts enable row level security;

drop policy if exists "users insert own attempts" on public.practice_attempts;
create policy "users insert own attempts"
  on public.practice_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own attempts" on public.practice_attempts;
create policy "users read own attempts"
  on public.practice_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "admin read all attempts" on public.practice_attempts;
create policy "admin read all attempts"
  on public.practice_attempts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'admin'
    )
  );
