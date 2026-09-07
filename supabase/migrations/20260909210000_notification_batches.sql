-- Apply in a maintenance window with legacy notification writers drained.
begin;

-- This is an upgrade, not a replacement for the application's baseline schema.
do $$
begin
  if to_regclass('auth.users') is null or to_regclass('public.profiles') is null
    or to_regclass('public.notifications') is null
    or to_regprocedure('public.is_admin()') is null
    or to_regprocedure('public.is_active_user()') is null then
    raise exception 'Notification upgrade requires the existing auth/profile/notification baseline and active-account authorization helpers'
      using errcode = '55000', hint = 'Restore/apply the existing baseline before this upgrade; do not bootstrap production with test fixtures.';
  end if;
  if exists (
    select 1 from unnest(array['id','recipient_id','sender_id','title','message','is_direct','read_at','created_at','revoked_at']) c(name)
    where not exists (select 1 from pg_attribute a
      where a.attrelid = 'public.notifications'::regclass and a.attname = c.name
        and a.attnum > 0 and not a.attisdropped)
  ) then
    raise exception 'Notification upgrade requires the completed legacy notification migrations'
      using errcode = '55000', hint = 'Apply the legacy direct-notification and revoke migrations first.';
  end if;
end;
$$;

lock table public.notifications in access exclusive mode;

create table public.notification_batches (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 2000),
  sender_id uuid not null references auth.users(id),
  audience_mode text not null check (audience_mode in ('selected', 'all')),
  recipient_count integer not null check (recipient_count >= 0),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  idempotency_key uuid,
  legacy boolean not null default false,
  -- Persist the canonical request, not surviving recipients, for stable retries.
  selected_recipient_ids uuid[],
  unique (sender_id, idempotency_key),
  check (legacy or idempotency_key is not null),
  check (legacy or (audience_mode = 'all' and selected_recipient_ids is null)
    or (audience_mode = 'selected' and cardinality(selected_recipient_ids) between 1 and 1000
      and selected_recipient_ids is not null))
);

create table public.notification_recipients (
  id bigint generated always as identity primary key,
  batch_id bigint not null references public.notification_batches(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_id, recipient_id)
);

-- Realtime invalidation only: never publish titles, messages or audience lists.
create table public.notification_batch_events (
  batch_id bigint primary key references public.notification_batches(id) on delete cascade,
  revoked_at timestamptz
);

insert into public.notification_batches
  (id, title, message, sender_id, audience_mode, recipient_count, created_at, revoked_at, legacy)
overriding system value
select id, title, message, sender_id, case when is_direct then 'selected' else 'all' end,
  1, created_at, revoked_at, true
from public.notifications;

insert into public.notification_recipients (id, batch_id, recipient_id, read_at, created_at)
overriding system value
select id, id, recipient_id, read_at, created_at from public.notifications;

insert into public.notification_batch_events (batch_id, revoked_at)
select id, revoked_at from public.notification_batches;

select setval(pg_get_serial_sequence('public.notification_batches', 'id'),
  coalesce((select max(id) from public.notification_batches), 1),
  exists (select 1 from public.notification_batches));
select setval(pg_get_serial_sequence('public.notification_recipients', 'id'),
  coalesce((select max(id) from public.notification_recipients), 1),
  exists (select 1 from public.notification_recipients));

create index notification_batches_created_idx on public.notification_batches (created_at desc, id desc);
create index notification_batches_sender_created_idx
  on public.notification_batches (sender_id, created_at desc) where not legacy;
create index notification_recipients_inbox_idx
  on public.notification_recipients (recipient_id, created_at desc, id desc) include (batch_id, read_at);
create index notification_recipients_unread_idx
  on public.notification_recipients (recipient_id, created_at desc, id desc) include (batch_id)
  where read_at is null;
create index notification_profiles_eligible_idx on public.profiles (id)
  where role = 'user' and status = 'active';

alter table public.notification_batches enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.notification_batch_events enable row level security;

revoke all on public.notification_batches, public.notification_recipients,
  public.notification_batch_events from public, anon, authenticated;
revoke all on sequence public.notification_batches_id_seq, public.notification_recipients_id_seq
  from public, anon, authenticated;
grant select on public.notification_recipients, public.notification_batch_events to authenticated;

create policy "active users read own recipient metadata" on public.notification_recipients
  for select to authenticated
  using ((select public.is_active_user()) and recipient_id = (select auth.uid()));
-- Do not filter revoked_at: subscribers must still be authorized after revocation.
create policy "authorized batch invalidation" on public.notification_batch_events
  for select to authenticated using (
    (select public.is_admin()) or ((select public.is_active_user()) and exists (
      select 1 from public.notification_recipients r
      where r.batch_id = notification_batch_events.batch_id and r.recipient_id = (select auth.uid())
    ))
  );

create function public.send_notification_batch(
  p_title text, p_message text, p_audience_mode text, p_recipient_ids uuid[], p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sender uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_selected uuid[];
  v_recipients uuid[];
  v_batch public.notification_batches%rowtype;
  v_now timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  if char_length(v_title) not between 1 and 120 or char_length(v_message) not between 1 and 2000
    or p_audience_mode is null or p_audience_mode not in ('selected', 'all')
    or p_idempotency_key is null then
    raise exception 'Invalid notification payload' using errcode = '22023';
  end if;
  if p_audience_mode = 'selected' then
    if coalesce(cardinality(p_recipient_ids), 0) not between 1 and 1000
      or exists (select 1 from unnest(p_recipient_ids) x(id) where x.id is null) then
      raise exception 'Select 1 to 1000 non-null recipient IDs' using errcode = '22023';
    end if;
    select array_agg(x.id order by x.id) into v_selected
    from (select distinct unnest(p_recipient_ids) as id) x;
  elsif coalesce(cardinality(p_recipient_ids), 0) <> 0 then
    raise exception 'All audience must not include recipient IDs' using errcode = '22023';
  end if;

  -- Serialize all sends by this sender, including distinct keys racing for the last slot.
  perform pg_advisory_xact_lock(hashtextextended('notification-send:' || v_sender::text, 0));
  select * into v_batch from public.notification_batches b
    where b.sender_id = v_sender and b.idempotency_key = p_idempotency_key;
  if found then
    if v_batch.title is distinct from v_title or v_batch.message is distinct from v_message
      or v_batch.audience_mode is distinct from p_audience_mode
      or v_batch.selected_recipient_ids is distinct from v_selected then
      raise exception 'Idempotency key payload mismatch' using errcode = '22023';
    end if;
    return jsonb_build_object('id', v_batch.id, 'recipient_count', v_batch.recipient_count);
  end if;

  v_now := clock_timestamp();
  if (select count(*) from public.notification_batches b
    where b.sender_id = v_sender and not b.legacy
      and b.created_at > v_now - interval '60 seconds') >= 10 then
    raise exception 'Notification rate limit exceeded: maximum 10 new batches per 60 seconds'
      using errcode = 'P0001';
  end if;

  -- One statement captures the eligible audience; never re-evaluate it during fan-out.
  select coalesce(array_agg(p.id order by p.id), '{}'::uuid[]) into v_recipients
  from public.profiles p where p.role = 'user' and p.status = 'active'
    and (p_audience_mode = 'all' or p.id = any(v_selected));
  if p_audience_mode = 'selected' and cardinality(v_recipients) <> cardinality(v_selected) then
    raise exception 'Every selected recipient must be an active user' using errcode = '22023';
  end if;

  insert into public.notification_batches
    (title, message, sender_id, audience_mode, recipient_count, idempotency_key, selected_recipient_ids, created_at)
  values (v_title, v_message, v_sender, p_audience_mode, cardinality(v_recipients),
    p_idempotency_key, v_selected, v_now) returning * into v_batch;
  insert into public.notification_recipients (batch_id, recipient_id, created_at)
    select v_batch.id, x.id, v_batch.created_at from unnest(v_recipients) x(id);
  insert into public.notification_batch_events (batch_id) values (v_batch.id);
  return jsonb_build_object('id', v_batch.id, 'recipient_count', v_batch.recipient_count);
end;
$$;

create function public.revoke_notification_batch(p_batch_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_revoked_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  update public.notification_batches b set revoked_at = coalesce(b.revoked_at, clock_timestamp())
    where b.id = p_batch_id returning b.revoked_at into v_revoked_at;
  if not found then return false; end if;
  update public.notification_batch_events e set revoked_at = v_revoked_at
    where e.batch_id = p_batch_id and e.revoked_at is distinct from v_revoked_at;
  return true;
end;
$$;

create function public.acknowledge_notification(p_notification_id bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_locked_batch_ids bigint[];
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  -- Serialize with revoke, including mark-all, so revoked rows cannot be acknowledged.
  select coalesce(array_agg(locked.id), '{}'::bigint[]) into v_locked_batch_ids
  from (select b.id from public.notification_batches b
    where b.revoked_at is null and exists (
      select 1 from public.notification_recipients r where r.batch_id = b.id
        and r.recipient_id = auth.uid() and r.read_at is null
        and (p_notification_id is null or r.id = p_notification_id)
     ) order by b.id for share) locked;
  update public.notification_recipients r set read_at = clock_timestamp()
    from public.notification_batches b
    where b.id = r.batch_id and b.revoked_at is null and r.recipient_id = auth.uid()
      -- A later statement snapshot must not acknowledge newly committed, unlocked batches.
      and b.id = any(v_locked_batch_ids)
      and r.read_at is null and (p_notification_id is null or r.id = p_notification_id);
end;
$$;

create function public.list_my_notifications(
  p_before_created_at timestamptz default null, p_before_id bigint default null,
  p_limit integer default 30, p_unread_only boolean default false, p_direct_only boolean default false
) returns table (id bigint, batch_id bigint, title text, message text, read_at timestamptz,
  created_at timestamptz, is_direct boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor fields are required' using errcode = '22023';
  end if;
  return query select r.id, b.id, b.title, b.message, r.read_at, r.created_at,
    b.audience_mode = 'selected'
  from public.notification_recipients r join public.notification_batches b on b.id = r.batch_id
  where r.recipient_id = auth.uid() and b.revoked_at is null
    and (not coalesce(p_unread_only, false) or r.read_at is null)
    and (not coalesce(p_direct_only, false) or b.audience_mode = 'selected')
    and (p_before_created_at is null or (r.created_at, r.id) < (p_before_created_at, p_before_id))
  order by r.created_at desc, r.id desc limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

create function public.count_my_unread_notifications()
returns integer language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  return (select count(*)::integer from public.notification_recipients r
    join public.notification_batches b on b.id = r.batch_id
    where r.recipient_id = auth.uid() and r.read_at is null and b.revoked_at is null);
end;
$$;

create function public.list_notification_batches(
  p_before_created_at timestamptz default null, p_before_id bigint default null, p_limit integer default 30
) returns table (id bigint, title text, message text, created_at timestamptz, is_direct boolean,
  recipient_count integer, revoked_at timestamptz, legacy boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor fields are required' using errcode = '22023';
  end if;
  return query select b.id, b.title, b.message, b.created_at, b.audience_mode = 'selected',
    b.recipient_count, b.revoked_at, b.legacy from public.notification_batches b
  where p_before_created_at is null or (b.created_at, b.id) < (p_before_created_at, p_before_id)
  order by b.created_at desc, b.id desc limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

create function public.get_notification_batch_details(p_batch_id bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'id', b.id, 'title', b.title, 'message', b.message, 'created_at', b.created_at,
      'is_direct', b.audience_mode = 'selected', 'recipient_count', b.recipient_count,
      'revoked_at', b.revoked_at, 'legacy', b.legacy,
      'remaining_count', counts.remaining_count, 'read_count', counts.read_count,
      'unread_count', counts.unread_count
    ) from public.notification_batches b
    cross join lateral (
      select count(*) as remaining_count,
        count(*) filter (where r.read_at is not null) as read_count,
        count(*) filter (where r.read_at is null) as unread_count
      from public.notification_recipients r where r.batch_id = b.id
    ) counts
    where b.id = p_batch_id
  );
end;
$$;

create function public.list_notification_batch_recipients(
  p_batch_id bigint, p_after_id uuid default null, p_limit integer default 50
) returns table (id uuid, display_name text, email text, read_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  return query select r.recipient_id, p.display_name::text, p.email::text, r.read_at
  from public.notification_recipients r left join public.profiles p on p.id = r.recipient_id
  where r.batch_id = p_batch_id and (p_after_id is null or r.recipient_id > p_after_id)
  order by r.recipient_id limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create function public.search_notification_recipients(
  p_query text default '', p_offset integer default 0, p_limit integer default 30
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_query text := btrim(coalesce(p_query, '')); v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  if char_length(v_query) > 200 then
    raise exception 'Search query must not exceed 200 characters' using errcode = '22023';
  end if;
  with eligible as materialized (
    select p.id, p.email, p.display_name from public.profiles p
    where p.role = 'user' and p.status = 'active'
  ), filtered as materialized (
    select * from eligible e where v_query = ''
      or strpos(lower(coalesce(e.email, '')), lower(v_query)) > 0
      or strpos(lower(coalesce(e.display_name, '')), lower(v_query)) > 0
      or strpos(e.id::text, lower(v_query)) > 0
  ), page as (
    select * from filtered order by id
    offset greatest(0, least(coalesce(p_offset, 0), 100000))
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page) order by page.id) from page), '[]'::jsonb),
    'total', (select count(*) from filtered), 'active_total', (select count(*) from eligible)
  ) into v_result;
  return v_result;
end;
$$;

-- Keep explicit refresh errors for old clients; never silently accept legacy writes.
create or replace function public.send_admin_notification(
  p_title text, p_message text, p_recipient_id uuid default null
) returns integer language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Notification API changed; refresh the application' using errcode = '0A000';
end;
$$;
create or replace function public.revoke_admin_notification(p_notification_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Notification API changed; refresh the application' using errcode = '0A000';
end;
$$;

-- Retain the legacy archive for verification, but deny all client reads and writes.
revoke all on public.notifications from public, anon, authenticated;
drop policy if exists "users acknowledge own notifications" on public.notifications;
drop policy if exists "users read own notifications" on public.notifications;
drop policy if exists "admin read all notifications" on public.notifications;
-- Table-level revocation does not remove any independently granted column privileges.
do $$
declare v_columns text;
begin
  select string_agg(quote_ident(attname), ', ') into v_columns from pg_attribute
    where attrelid = 'public.notifications'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke select (%s), insert (%s), update (%s), references (%s) on public.notifications from public, anon, authenticated',
    v_columns, v_columns, v_columns, v_columns);
end;
$$;

revoke all on function public.send_notification_batch(text,text,text,uuid[],uuid),
  public.get_notification_batch_details(bigint),
  public.revoke_notification_batch(bigint), public.acknowledge_notification(bigint),
  public.list_my_notifications(timestamptz,bigint,integer,boolean,boolean),
  public.count_my_unread_notifications(), public.list_notification_batches(timestamptz,bigint,integer),
  public.list_notification_batch_recipients(bigint,uuid,integer),
  public.search_notification_recipients(text,integer,integer),
  public.send_admin_notification(text,text,uuid), public.revoke_admin_notification(bigint)
from public, anon, authenticated;
grant execute on function public.send_notification_batch(text,text,text,uuid[],uuid),
  public.get_notification_batch_details(bigint),
  public.revoke_notification_batch(bigint), public.acknowledge_notification(bigint),
  public.list_my_notifications(timestamptz,bigint,integer,boolean,boolean),
  public.count_my_unread_notifications(), public.list_notification_batches(timestamptz,bigint,integer),
  public.list_notification_batch_recipients(bigint,uuid,integer),
  public.search_notification_recipients(text,integer,integer),
  public.send_admin_notification(text,text,uuid), public.revoke_admin_notification(bigint)
to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime drop table public.notifications;
    end if;
    alter publication supabase_realtime add table public.notification_recipients, public.notification_batch_events;
  end if;
end;
$$;

commit;
