-- Enforce account status in database policies and privileged checks.

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- Profiles remain readable by the owner so a blocked user can be identified by the client.
-- The update policy was removed by 20260906110000_lock_profile_updates.sql.

drop policy if exists "users insert own activity" on public.user_activity_events;
create policy "users insert own activity"
  on public.user_activity_events
  for insert
  to authenticated
  with check (public.is_active_user() and auth.uid() = user_id);

drop policy if exists "users read own activity" on public.user_activity_events;
create policy "users read own activity"
  on public.user_activity_events
  for select
  to authenticated
  using (public.is_active_user() and auth.uid() = user_id);

drop policy if exists "admin read all activity" on public.user_activity_events;
create policy "admin read all activity"
  on public.user_activity_events
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "users insert own attempts" on public.practice_attempts;
create policy "users insert own attempts"
  on public.practice_attempts
  for insert
  to authenticated
  with check (public.is_active_user() and auth.uid() = user_id);

drop policy if exists "users read own attempts" on public.practice_attempts;
create policy "users read own attempts"
  on public.practice_attempts
  for select
  to authenticated
  using (public.is_active_user() and auth.uid() = user_id);

drop policy if exists "admin read all attempts" on public.practice_attempts;
create policy "admin read all attempts"
  on public.practice_attempts
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin read all learning stats" on public.user_learning_stats;
create policy "admin read all learning stats"
  on public.user_learning_stats
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "read visible learning stats" on public.user_learning_stats;
create policy "read visible learning stats"
  on public.user_learning_stats
  for select
  to authenticated
  using (public.is_active_user() and (visible = true or auth.uid() = user_id));

drop policy if exists "write own learning stats" on public.user_learning_stats;
create policy "write own learning stats"
  on public.user_learning_stats
  for all
  to authenticated
  using (public.is_active_user() and auth.uid() = user_id)
  with check (public.is_active_user() and auth.uid() = user_id);

drop policy if exists "users read own purchases" on public.purchases;
create policy "users read own purchases"
  on public.purchases
  for select
  to authenticated
  using (public.is_active_user() and auth.uid() = user_id);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
  on public.orders
  for select
  to authenticated
  using (public.is_active_user() and auth.uid() = user_id);
