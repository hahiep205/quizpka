-- Complete the initplan-safe policy pass for the remaining hot tables.

drop policy if exists "users read own quiz sessions" on public.quiz_sessions;
create policy "users read own quiz sessions" on public.quiz_sessions
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);

drop policy if exists "users read own attempt outbox" on public.attempt_submission_outbox;
create policy "users read own attempt outbox" on public.attempt_submission_outbox
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);

drop policy if exists "users read own support reports" on public.support_reports;
create policy "users read own support reports" on public.support_reports
  for select to authenticated using (public.is_active_user() and (select auth.uid()) = user_id);

drop policy if exists "users insert own blocked view" on public.blocked_account_views;
create policy "users insert own blocked view" on public.blocked_account_views
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "users read own blocked views" on public.blocked_account_views;
create policy "users read own blocked views" on public.blocked_account_views
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "users insert own activity" on public.user_activity_events;
create policy "users insert own activity" on public.user_activity_events
  for insert to authenticated with check (public.is_active_user() and (select auth.uid()) = user_id);
