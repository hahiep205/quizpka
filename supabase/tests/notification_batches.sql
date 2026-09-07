-- Run after bootstrap and migration in a disposable database. All test mutations roll back.
begin;
create temp table notification_test_state (name text primary key, payload jsonb);
grant all on notification_test_state to authenticated;

do $$
begin
  assert (select count(*) from public.notification_batches where legacy) = 3, 'one batch per legacy row';
  assert not exists (
    select 1 from public.notifications n
    left join public.notification_batches b on b.id = n.id
    left join public.notification_recipients r on r.id = n.id
    where b.id is null or r.id is null or not b.legacy or b.recipient_count <> 1
      or b.title <> n.title or b.message <> n.message or b.sender_id <> n.sender_id
      or b.created_at <> n.created_at or b.revoked_at is distinct from n.revoked_at
      or (b.audience_mode = 'selected') <> n.is_direct or r.batch_id <> n.id
      or r.recipient_id <> n.recipient_id or r.read_at is distinct from n.read_at
      or r.created_at <> n.created_at
  ), 'legacy fields preserved';
  assert not has_table_privilege('authenticated','public.notifications','UPDATE');
  assert not has_column_privilege('authenticated','public.notifications','title','UPDATE');
  assert not has_table_privilege('authenticated','public.notification_batches','SELECT');
  assert not has_table_privilege('authenticated','public.notification_recipients','UPDATE');
  assert not has_function_privilege('anon','public.send_notification_batch(text,text,text,uuid[],uuid)','EXECUTE');
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare v jsonb; v_retry jsonb; v_count integer; v_case integer;
begin
  v := public.send_notification_batch(' Test ', ' Message ', 'selected', array[
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid], '10000000-0000-0000-0000-000000000001');
  assert (v->>'recipient_count')::integer = 2 and (v->>'id')::bigint > 3;
  insert into notification_test_state values ('selected', v);
  v_retry := public.send_notification_batch('Test','Message','selected',array[
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid], '10000000-0000-0000-0000-000000000001');
  assert v = v_retry, 'canonical retry must not duplicate';
  select count(*) into v_count from public.list_notification_batches();
  for v_case in 1..10 loop
    begin
      case v_case
        when 1 then perform public.send_notification_batch('Other','Message','selected',
          array['00000000-0000-0000-0000-000000000002'::uuid], '10000000-0000-0000-0000-000000000001');
        when 2 then perform public.send_notification_batch('Test','Message','selected','{}',gen_random_uuid());
        when 3 then perform public.send_notification_batch('Test','Message','selected',null,gen_random_uuid());
        when 4 then perform public.send_notification_batch('Test','Message','selected',array[null::uuid],gen_random_uuid());
        when 5 then perform public.send_notification_batch('Test','Message','selected',
          array['00000000-0000-0000-0000-000000000004'::uuid],gen_random_uuid());
        when 6 then perform public.send_notification_batch('Test','Message','selected',
          array['00000000-0000-0000-0000-000000000001'::uuid],gen_random_uuid());
        when 7 then perform public.send_notification_batch('Test','Message','selected',array[gen_random_uuid()],gen_random_uuid());
        when 8 then perform public.send_notification_batch('Test','Message','selected',
          array_fill('00000000-0000-0000-0000-000000000002'::uuid,array[1001]),gen_random_uuid());
        when 9 then perform public.send_notification_batch('Test','Message','all',
          array['00000000-0000-0000-0000-000000000002'::uuid],gen_random_uuid());
        when 10 then perform public.send_notification_batch('Test','Message','all',null,null);
      end case;
      raise exception 'Validation case % unexpectedly succeeded', v_case;
    exception when invalid_parameter_value then null;
    end;
  end loop;
  assert (select count(*) from public.list_notification_batches()) = v_count, 'invalid sends atomic';
  v := public.send_notification_batch('Test','Message','all',null,'10000000-0000-0000-0000-000000000002');
  assert (v->>'recipient_count')::integer = 2;
  insert into notification_test_state values ('all',v);
  v := public.search_notification_recipients('ALICE');
  assert (v->>'total')::integer = 1 and (v->>'active_total')::integer = 2;
  assert jsonb_array_length(v->'items') = 1;
  v := public.search_notification_recipients('000000000002');
  assert (v->>'total')::integer = 1 and (v->>'active_total')::integer = 2;
  assert v->'items'->0->>'id' = '00000000-0000-0000-0000-000000000002', 'UUID substring search';
  assert (public.search_notification_recipients('000000000004')->>'total')::integer = 0,
    'UUID search excludes blocked users';
  assert (public.search_notification_recipients('%')->>'total')::integer = 0, 'search is literal';
  v := public.search_notification_recipients('',100000,1000);
  assert v->'items' = '[]'::jsonb and (v->>'total')::integer = 2;
  assert (select count(*) from public.list_notification_batch_recipients(
    (select (payload->>'id')::bigint from notification_test_state where name='selected'))) = 2;
  begin perform public.send_admin_notification('x','x'); raise exception 'legacy send allowed';
    exception when feature_not_supported then null; end;
  begin perform public.revoke_admin_notification(1); raise exception 'legacy revoke allowed';
    exception when feature_not_supported then null; end;
  begin perform public.list_notification_batches(now(),null); raise exception 'half cursor allowed';
    exception when invalid_parameter_value then null; end;
end;
$$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
declare v_id bigint; v_read timestamptz; v_first record;
begin
  assert public.count_my_unread_notifications() = 4;
  assert (select count(*) from public.list_my_notifications(p_direct_only => true)) = 2;
  assert (select count(*) from public.notification_recipients where recipient_id <> auth.uid()) = 0;
  assert (select count(*) from public.notification_batch_events where batch_id = 2) = 0;
  begin perform public.search_notification_recipients(); raise exception 'user accessed search';
    exception when insufficient_privilege then null; end;
  begin perform public.list_notification_batches(); raise exception 'user accessed history';
    exception when insufficient_privilege then null; end;
  begin perform public.list_notification_batch_recipients(1); raise exception 'user accessed recipients';
    exception when insufficient_privilege then null; end;
  begin perform public.revoke_notification_batch(1); raise exception 'user revoked';
    exception when insufficient_privilege then null; end;
  begin perform public.send_notification_batch('x','x','all',null,gen_random_uuid()); raise exception 'user sent';
    exception when insufficient_privilege then null; end;
  begin update public.notification_recipients set read_at = now(); raise exception 'direct write allowed';
    exception when insufficient_privilege then null; end;
  begin perform title from public.notification_batches; raise exception 'content exposed';
    exception when insufficient_privilege then null; end;
  select * into v_first from public.list_my_notifications(p_limit => 1);
  assert (select count(*) from public.list_my_notifications(v_first.created_at,v_first.id,100)) = 3,
    'tuple cursor handles tied timestamps';
  select id into v_id from public.list_my_notifications() where batch_id =
    (select (payload->>'id')::bigint from notification_test_state where name='selected');
  perform public.acknowledge_notification(v_id);
  select read_at into v_read from public.list_my_notifications() where id = v_id;
  assert v_read >= transaction_timestamp() and v_read <= clock_timestamp(), 'server timestamp';
  perform public.acknowledge_notification(v_id);
  assert (select read_at from public.list_my_notifications() where id=v_id) = v_read, 'ack idempotent';
  perform public.acknowledge_notification(2);
  assert public.count_my_unread_notifications() = 3, 'cannot ack another user';
end;
$$;

reset role;
update public.profiles set status='blocked' where id='00000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare v_id bigint;
begin
  assert public.send_notification_batch('Test','Message','all',null,'10000000-0000-0000-0000-000000000002') =
    (select payload from notification_test_state where name='all'), 'all retry retains original snapshot';
  assert public.send_notification_batch('Test','Message','selected',array[
    '00000000-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000003'::uuid],
    '10000000-0000-0000-0000-000000000001') =
    (select payload from notification_test_state where name='selected'), 'selected retry survives status change';
  select (payload->>'id')::bigint into v_id from notification_test_state where name='all';
  assert public.revoke_notification_batch(v_id);
  assert public.revoke_notification_batch(v_id);
  assert not public.revoke_notification_batch(-1);
  assert (select revoked_at is null from public.list_notification_batches() where id=
    (select (payload->>'id')::bigint from notification_test_state where name='selected')), 'exact revoke';
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
begin
  assert public.count_my_unread_notifications() = 2, 'revoked excluded';
  assert exists (select 1 from public.notification_batch_events where revoked_at is not null),
    'revoke metadata remains RLS-visible';
  perform public.acknowledge_notification();
  assert public.count_my_unread_notifications() = 0;
  assert (select count(*) from public.list_my_notifications(p_unread_only=>true)) = 0;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$
begin
  assert (select count(*) from public.notification_recipients) = 0;
  assert (select count(*) from public.notification_batch_events) = 0;
  begin perform public.list_my_notifications(); raise exception 'blocked inbox allowed';
    exception when insufficient_privilege then null; end;
  begin perform public.count_my_unread_notifications(); raise exception 'blocked count allowed';
    exception when insufficient_privilege then null; end;
  begin perform public.acknowledge_notification(); raise exception 'blocked ack allowed';
    exception when insufficient_privilege then null; end;
end;
$$;
reset role;
update public.profiles set status='blocked' where id='00000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  begin perform public.send_notification_batch('x','x','all',null,gen_random_uuid()); raise exception 'blocked admin sent';
    exception when insufficient_privilege then null; end;
  begin perform public.revoke_notification_batch(1); raise exception 'blocked admin revoked';
    exception when insufficient_privilege then null; end;
  begin perform public.search_notification_recipients(); raise exception 'blocked admin searched';
    exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
do $$
declare v jsonb;
begin
  v := public.send_notification_batch('Other sender','Message','all',null,'10000000-0000-0000-0000-000000000002');
  assert (v->>'id')::bigint <> (select (payload->>'id')::bigint from notification_test_state where name='all'),
    'idempotency is scoped to sender';
  assert (v->>'recipient_count')::integer = 1, 'new send takes new snapshot';
end;
$$;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  begin perform public.list_my_notifications(); raise exception 'missing JWT allowed';
    exception when insufficient_privilege then null; end;
end;
$$;
reset role;
do $$
begin
  assert not exists (select 1 from public.notification_recipients r
    join public.notification_batches b on b.id=r.batch_id
    where not b.legacy and b.revoked_at is not null and r.read_at is not null), 'revoked not acknowledged';
  assert (select read_at from public.notification_recipients where id=2) = '2026-09-01 01:00:00+00'::timestamptz;
  assert not exists (select 1 from public.notification_batches b
    where b.recipient_count <> (select count(*) from public.notification_recipients r where r.batch_id=b.id));
end;
$$;
savepoint rate_limit_tests;
update public.profiles set status='active' where id='00000000-0000-0000-0000-000000000001';
-- Avoid sleeps: age existing sends out, and put legacy rows inside the window.
update public.notification_batches set created_at = clock_timestamp() - interval '61 seconds' where not legacy;
update public.notification_batches set created_at = clock_timestamp() where legacy;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare v jsonb; v_key uuid := gen_random_uuid(); v_i integer; v_before integer;
begin
  for v_i in 1..10 loop
    v := public.send_notification_batch('Rate','Message','all',null,
      case when v_i=10 then v_key else gen_random_uuid() end);
  end loop;
  assert public.send_notification_batch('Rate','Message','all',null,v_key) = v,
    'retry bypasses exhausted rate limit';
  select count(*) into v_before from public.list_notification_batches(p_limit=>100);
  begin
    perform public.send_notification_batch('Different','Message','all',null,v_key);
    raise exception 'Mismatch unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;
  -- Revoking does not refund the budget.
  perform public.revoke_notification_batch((v->>'id')::bigint);
  begin
    perform public.send_notification_batch('Rate','Message','all',null,gen_random_uuid());
    raise exception 'Eleventh send unexpectedly allowed';
  exception when sqlstate 'P0001' then
    assert sqlerrm = 'Notification rate limit exceeded: maximum 10 new batches per 60 seconds';
  end;
  assert (select count(*) from public.list_notification_batches(p_limit=>100)) = v_before,
    'rate rejection creates no batch';
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
do $$
begin
  perform public.send_notification_batch('Independent budget','Message','all',null,gen_random_uuid());
end;
$$;
reset role;
do $$
begin
  assert (select count(*) from public.notification_batches where not legacy
    and sender_id='00000000-0000-0000-0000-000000000001'
    and created_at > clock_timestamp() - interval '60 seconds') = 10,
    'exactly ten new batches; recent legacy and expired sends excluded';
  assert not exists (select 1 from public.notification_batches b where not b.legacy
    and (b.recipient_count <> (select count(*) from public.notification_recipients r where r.batch_id=b.id)
      or not exists (select 1 from public.notification_batch_events e where e.batch_id=b.id)));
end;
$$;
update public.notification_batches set created_at = clock_timestamp() - interval '61 seconds'
  where id = (select min(id) from public.notification_batches where not legacy
    and sender_id='00000000-0000-0000-0000-000000000001'
    and created_at > clock_timestamp() - interval '60 seconds');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  perform public.send_notification_batch('Window reopened','Message','all',null,gen_random_uuid());
end;
$$;
reset role;
rollback to savepoint rate_limit_tests;
savepoint batch_details_tests;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
do $$
declare v jsonb;
begin
  assert public.get_notification_batch_details(-1) is null, 'missing details return SQL null';
  assert public.get_notification_batch_details(null) is null;
  v := public.get_notification_batch_details(2);
  assert v = jsonb_build_object('id',2,'title','Same','message','Same',
    'created_at','2026-09-01 00:00:00+00'::timestamptz,'is_direct',false,
    'recipient_count',1,'revoked_at','2026-09-02 00:00:00+00'::timestamptz,
    'legacy',true,'remaining_count',1,'read_count',1,'unread_count',0), 'exact legacy/revoked details contract';
  v := public.get_notification_batch_details(
    (select (payload->>'id')::bigint from notification_test_state where name='selected'));
  assert not (v->>'legacy')::boolean and (v->>'is_direct')::boolean;
  assert (v->>'recipient_count')::integer=2 and (v->>'remaining_count')::integer=2
    and (v->>'read_count')::integer=1 and (v->>'unread_count')::integer=1,
    'aggregate includes blocked recipients and all pages';
end;
$$;
reset role;
delete from public.notification_recipients where batch_id =
  (select (payload->>'id')::bigint from notification_test_state where name='selected');
set local role authenticated;
do $$
declare v jsonb;
begin
  v := public.get_notification_batch_details(
    (select (payload->>'id')::bigint from notification_test_state where name='selected'));
  assert (v->>'recipient_count')::integer=2 and (v->>'remaining_count')::integer=0
    and (v->>'read_count')::integer=0 and (v->>'unread_count')::integer=0,
    'empty surviving audience retains original count';
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
begin
  begin perform public.get_notification_batch_details(1); raise exception 'user read batch details';
    exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  begin perform public.get_notification_batch_details(1); raise exception 'blocked admin read batch details';
    exception when insufficient_privilege then null; end;
end;
$$;
reset role;
do $$
begin
  assert not has_function_privilege('anon','public.get_notification_batch_details(bigint)','EXECUTE');
end;
$$;
rollback to savepoint batch_details_tests;

savepoint acknowledgment_snapshot_tests;
-- Single-session interleaving simulation: instrument only this transaction's function
-- to introduce a new delivery between the lock SELECT and UPDATE. Rollback restores it.
do $test$
declare v_definition text;
begin
  v_definition := pg_get_functiondef('public.acknowledge_notification(bigint)'::regprocedure);
  assert strpos(v_definition, '  update public.notification_recipients r set read_at') > 0;
  v_definition := replace(v_definition, '  update public.notification_recipients r set read_at', $inject$
  with new_batch as (
    insert into public.notification_batches
      (title,message,sender_id,audience_mode,recipient_count,idempotency_key)
    values ('Interleaved send','Must remain unread','00000000-0000-0000-0000-000000000005','all',1,gen_random_uuid())
    returning id
  ) insert into public.notification_recipients (batch_id,recipient_id)
    select id, auth.uid() from new_batch;
  update public.notification_recipients r set read_at$inject$);
  execute v_definition;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
declare v_id bigint;
begin
  -- First call has an existing unread batch; the injected batch must not join its update.
  perform public.acknowledge_notification();
  assert public.count_my_unread_notifications() = 1, 'mark-all excludes newly visible unlocked batch';
  select id into v_id from public.list_my_notifications(p_unread_only=>true);
  perform public.acknowledge_notification(v_id);
  assert public.count_my_unread_notifications() = 1, 'single acknowledgment stays scoped';
  -- No owned row has this ID: an empty lock set must not become an unrestricted update.
  perform public.acknowledge_notification(-1);
  assert public.count_my_unread_notifications() = 2, 'empty lock set acknowledges nothing';
end;
$$;
reset role;
rollback to savepoint acknowledgment_snapshot_tests;
rollback;
select 'notification_batches regression passed' as result;
