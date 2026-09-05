grant execute on function public.enqueue_attempt_submission(uuid, uuid, text, jsonb) to authenticated;

create or replace function public.enqueue_attempt_submission(p_session_id uuid, p_user_id uuid, p_idempotency_key text, p_answers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare outbox_id uuid;
begin
  if auth.uid() is null or p_user_id <> auth.uid() then raise exception 'Not your attempt' using errcode = '42501'; end if;
  if not public.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  if p_session_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) < 16 then raise exception 'Invalid attempt outbox request' using errcode = '22023'; end if;
  insert into public.attempt_submission_outbox (session_id, user_id, idempotency_key, payload)
  values (p_session_id, p_user_id, trim(p_idempotency_key), jsonb_build_object('answers', p_answers))
  on conflict (session_id) do update set payload = excluded.payload, status = 'pending', next_retry_at = now(), updated_at = now()
  returning id into outbox_id;
  return outbox_id;
end;
$$;

revoke all on function public.enqueue_attempt_submission(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.enqueue_attempt_submission(uuid, uuid, text, jsonb) to authenticated, service_role;
