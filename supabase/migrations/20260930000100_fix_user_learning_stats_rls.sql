-- P1: gộp 2 SELECT policy trên user_learning_stats thành 1 + initplan-safe.
--
-- Trước: "admin read all learning stats" (is_admin()) và
-- "read visible learning stats" (is_active_user() AND (visible OR auth.uid()=user_id))
-- → 2 permissive policies cho cùng role+action (multiple_permissive_policies WARN)
-- → auth.*() re-evaluate mỗi row (auth_rls_initplan WARN), full-scan càng đắt.
--
-- Sau: 1 policy duy nhất, giữ nguyên semantics:
-- active user đọc được row visible=true hoặc row của chính mình; admin đọc hết.

drop policy if exists "admin read all learning stats" on public.user_learning_stats;
drop policy if exists "read visible learning stats" on public.user_learning_stats;

create policy "leaderboard read"
  on public.user_learning_stats
  for select
  to authenticated
  using (
    (select public.is_active_user())
    and (
      visible = true
      or user_id = (select auth.uid())
      or (select public.is_admin())
    )
  );
