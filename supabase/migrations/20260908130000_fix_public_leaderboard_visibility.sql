-- Public leaderboard rows are controlled by the user's visibility setting.
-- Keep verified as an internal/admin quality signal; requiring it here hid
-- legacy leaderboard data from normal users after the server verification rollout.
drop policy if exists "read visible verified learning stats" on public.user_learning_stats;
drop policy if exists "read visible learning stats" on public.user_learning_stats;
create policy "read visible learning stats"
  on public.user_learning_stats
  for select to authenticated
  using (public.is_active_user() and (visible = true or auth.uid() = user_id));
