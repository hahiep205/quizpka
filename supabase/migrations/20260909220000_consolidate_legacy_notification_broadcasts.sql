-- Consolidate only exact legacy broadcast identities, never a rounded time window.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Match send/ack/revoke ordering. EXCLUSIVE also drains FOR SHARE acknowledgments
-- before reparenting; ordinary SELECTs remain available during this short repair.
lock table public.notification_batches, public.notification_recipients,
  public.notification_batch_events in exclusive mode;
lock table public.notifications in share mode;

create temporary table legacy_broadcast_groups on commit drop as
with candidates as (
  select min(id) as representative_id, array_agg(id order by id) as batch_ids,
    sum(recipient_count)::integer as recipient_count
  from public.notification_batches
  where legacy and audience_mode = 'all'
  group by sender_id, title, message, created_at, revoked_at
  having count(*) > 1
)
select c.* from candidates c
where (select count(*) = count(distinct r.recipient_id)
  from public.notification_recipients r where r.batch_id = any(c.batch_ids));

create temporary table legacy_broadcast_reparent on commit drop as
select unnest(batch_ids) as old_id, representative_id, recipient_count
from legacy_broadcast_groups;

-- Capture live read/revoke state, not the archive's potentially older state.
create temporary table legacy_broadcast_before on commit drop as
select r.id, r.recipient_id, r.read_at, r.created_at, b.sender_id, b.title,
  b.message, b.created_at as sent_at, b.revoked_at, b.audience_mode, b.legacy
from public.notification_recipients r
join public.notification_batches b on b.id = r.batch_id;
create temporary table legacy_broadcast_archive on commit drop as
select * from public.notifications;

-- Every delivery being reparented must still have its original archived identity.
do $$
begin
  if exists (
    select 1 from public.notification_recipients r
    join legacy_broadcast_reparent m on m.old_id = r.batch_id
    join public.notification_batches b on b.id = r.batch_id
    left join public.notifications n on n.id = r.id
    where n.id is null or n.is_direct or
      (n.recipient_id, n.created_at, n.sender_id, n.title, n.message)
      is distinct from (r.recipient_id, r.created_at, b.sender_id, b.title, b.message)
  ) then
    raise exception 'Legacy broadcast repair requires intact archived delivery identities';
  end if;
end;
$$;

update public.notification_recipients r set batch_id = m.representative_id
from legacy_broadcast_reparent m
where r.batch_id = m.old_id and m.old_id <> m.representative_id;

update public.notification_batches b set recipient_count = g.recipient_count
from legacy_broadcast_groups g where b.id = g.representative_id;

delete from public.notification_batch_events e using legacy_broadcast_reparent m
where e.batch_id = m.old_id and m.old_id <> m.representative_id;
delete from public.notification_batches b using legacy_broadcast_reparent m
where b.id = m.old_id and m.old_id <> m.representative_id;

do $$
begin
  if exists (
    with after_state as (
      select r.id, r.recipient_id, r.read_at, r.created_at, b.sender_id, b.title,
        b.message, b.created_at as sent_at, b.revoked_at, b.audience_mode, b.legacy
      from public.notification_recipients r
      join public.notification_batches b on b.id = r.batch_id
    )
    (select * from legacy_broadcast_before except select * from after_state)
    union all
    (select * from after_state except select * from legacy_broadcast_before)
  ) or exists (
    (select * from legacy_broadcast_archive except select * from public.notifications)
    union all
    (select * from public.notifications except select * from legacy_broadcast_archive)
  ) then
    raise exception 'Legacy broadcast repair changed delivery state or archive';
  end if;
end;
$$;
commit;
