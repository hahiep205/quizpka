-- Harden user-facing RPCs that can create writes or expensive retries.

revoke all on function public.send_admin_notification(text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_admin_notification(bigint)
  from public, anon, authenticated;

create or replace function public.increment_subject_attempt(p_subject_id text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_count bigint; v_allowed boolean;
begin
  if not public.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  if p_subject_id is null or length(trim(p_subject_id)) = 0 or length(trim(p_subject_id)) > 120 then raise exception 'Invalid subject'; end if;
  select public.check_edge_rate_limit('subject-attempt:' || (select auth.uid())::text, 120, 3600) into v_allowed;
  if not coalesce(v_allowed, false) then raise exception 'Too many requests' using errcode = 'P0001'; end if;
  insert into public.subject_attempt_counts as counts(subject_id, attempt_count)
  values (trim(p_subject_id), 1)
  on conflict (subject_id) do update set attempt_count = counts.attempt_count + 1, updated_at = now()
  returning counts.attempt_count into new_count;
  return new_count;
end;
$$;
revoke all on function public.increment_subject_attempt(text) from public, anon;
grant execute on function public.increment_subject_attempt(text) to authenticated;

create or replace function public.submit_support_report(p_type text, p_subject text, p_description text, p_page_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare report_id uuid; v_allowed boolean;
begin
  if not public.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  if p_type not in ('report','contribute','feedback') then raise exception 'Invalid support type'; end if;
  if char_length(trim(coalesce(p_subject,''))) not between 1 and 160
     or char_length(trim(coalesce(p_description,''))) not between 1 and 4000
     or char_length(coalesce(p_page_url,'')) > 1000 then raise exception 'Invalid support report'; end if;
  select public.check_edge_rate_limit('support-report:' || (select auth.uid())::text, 5, 3600) into v_allowed;
  if not coalesce(v_allowed, false) then raise exception 'Too many support reports' using errcode = 'P0001'; end if;
  insert into public.support_reports(user_id, type, subject, description, page_url)
  values ((select auth.uid()), p_type, trim(p_subject), trim(p_description), nullif(trim(p_page_url), ''))
  returning id into report_id;
  return report_id;
end;
$$;
revoke all on function public.submit_support_report(text,text,text,text) from public, anon;
grant execute on function public.submit_support_report(text,text,text,text) to authenticated;

create or replace function public.enqueue_attempt_submission(p_session_id uuid, p_user_id uuid, p_idempotency_key text, p_answers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare outbox_id uuid; v_allowed boolean;
begin
  if (select auth.uid()) is null or p_user_id <> (select auth.uid()) then raise exception 'Not your attempt' using errcode = '42501'; end if;
  if not public.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  if p_session_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) not between 16 and 100
     or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 65536 then raise exception 'Invalid attempt outbox request' using errcode = '22023'; end if;
  select public.check_edge_rate_limit('attempt-outbox:' || p_user_id::text, 30, 3600) into v_allowed;
  if not coalesce(v_allowed, false) then raise exception 'Too many submissions' using errcode = 'P0001'; end if;
  insert into public.attempt_submission_outbox(session_id, user_id, idempotency_key, payload)
  values (p_session_id, p_user_id, trim(p_idempotency_key), jsonb_build_object('answers', p_answers))
  on conflict (session_id) do update set payload = excluded.payload, status = 'pending', next_retry_at = now(), updated_at = now()
  returning id into outbox_id;
  return outbox_id;
end;
$$;
revoke all on function public.enqueue_attempt_submission(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.enqueue_attempt_submission(uuid,uuid,text,jsonb) to authenticated;
