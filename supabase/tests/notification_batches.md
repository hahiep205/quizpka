# Notification Backend Contract

Migration: `C:/CBM/QuizPKA-Test01/supabase/migrations/20260909210000_notification_batches.sql`.

No frontend files or remote database were changed. The migration depends on the existing
`profiles`, `auth.users`, legacy `notifications`, `is_admin()` and `is_active_user()` schema.
The graph was consulted first; notification SQL was untracked or partially indexed, so
the current migration sources were read directly. Eligibility preserves existing behavior:
`profiles.role = 'user' AND profiles.status = 'active'`, not administrators.

## Exact RPCs

All functions are in `public`, executable by `authenticated`, security-definer with an
empty search path and explicit authorization. Anonymous execution is denied. Active-admin
RPCs operate across administrators' batches, not just batches sent by the caller.

```sql
send_notification_batch(
  p_title text,
  p_message text,
  p_audience_mode text,
  p_recipient_ids uuid[],
  p_idempotency_key uuid
) returns jsonb -- {"id": bigint, "recipient_count": integer}

revoke_notification_batch(p_batch_id bigint) returns boolean

acknowledge_notification(p_notification_id bigint default null) returns void

list_my_notifications(
  p_before_created_at timestamptz default null,
  p_before_id bigint default null,
  p_limit integer default 30,
  p_unread_only boolean default false,
  p_direct_only boolean default false
) returns table (
  id bigint, batch_id bigint, title text, message text,
  read_at timestamptz, created_at timestamptz, is_direct boolean
)

count_my_unread_notifications() returns integer

get_notification_batch_details(p_batch_id bigint) returns jsonb
-- {id, title, message, created_at, is_direct, recipient_count, revoked_at,
--  legacy, remaining_count, read_count, unread_count}; missing batch -> null

list_notification_batches(
  p_before_created_at timestamptz default null,
  p_before_id bigint default null,
  p_limit integer default 30
) returns table (
  id bigint, title text, message text, created_at timestamptz,
  is_direct boolean, recipient_count integer, revoked_at timestamptz, legacy boolean
)

list_notification_batch_recipients(
  p_batch_id bigint,
  p_after_id uuid default null,
  p_limit integer default 50
) returns table (id uuid, display_name text, email text, read_at timestamptz)

search_notification_recipients(
  p_query text default '',
  p_offset integer default 0,
  p_limit integer default 30
) returns jsonb
-- {"items": [{"id": uuid, "email": text, "display_name": text}],
--  "total": filtered_count, "active_total": all_eligible_count}
```

- Send, revoke, batch history, batch recipients and recipient search require an active admin.
- Inbox, unread count and acknowledgment require an active account and only access its own deliveries.
- Inbox `id` is the recipient-row ID, not batch ID. Pass it to acknowledgment. Admin recipient-list `id` is the user UUID.
- `is_direct` means `audience_mode = 'selected'`, including a multi-user selection. Legacy values are preserved.
- Inbox/history use descending `(created_at, id)` keysets. Supply both fields from the last row; partial cursors raise `22023`. Initial cursors are null.
- Batch recipients use ascending user UUID keysets. Missing batch returns an empty list. History includes revoked and legacy batches; inbox/count exclude revoked batches.
- Page limits clamp to 1..100, null uses the declared default. Search offsets clamp to 0..100000; search is literal case-insensitive substring over email/name/user UUID, trimmed and capped at 200 characters. An empty page still includes correct totals. Search scans the eligible set intentionally at the current 679-profile scale; no extension is required.
- Null boolean filters behave as false. Acknowledgment with null marks all own unread, nonrevoked rows; nonexistent/foreign IDs are no-ops. Server timestamps are write-once. Batch row locks serialize acknowledgment with revocation.
- Titles/messages are trimmed, capped at 120/2000 characters and cannot be blank. Selected requires 1..1000 input IDs, rejects null elements, and validates every distinct ID. Duplicates collapse; order is irrelevant. All requires null or an empty recipient array.
- Every send requires a client-generated UUID key. Reuse the same key only to retry the same canonical payload. Mismatch raises `22023`; unauthorized calls raise `42501`. Generate a new key for an intentional resend.
- A namespaced sender advisory transaction lock and sender/key unique constraint prevent duplicate sends. Selected payload IDs are persisted independently of recipient deletion/status changes. A valid retry returns the original batch/count, including after revocation; it does not redeliver or take a fresh audience snapshot.
- New sends allow at most 10 nonlegacy batches per sender in a rolling 60-second window. The sender lock serializes distinct-key sends and the rate check. Existing matching-key retries return before rate checking; mismatched retries still raise `22023`. Revoked batches count; legacy and expired batches do not. Rejection raises `P0001` with `Notification rate limit exceeded: maximum 10 new batches per 60 seconds`. Failed sends consume no slot. A partial `(sender_id, created_at DESC) WHERE NOT legacy` index supports the check. Send timestamps use wall-clock time after acquiring the lock, not transaction-start time. This assumes the normal PostgREST READ COMMITTED transaction isolation.
- All snapshots eligible IDs once and inserts recipients set-wise in the same transaction. An empty all audience is allowed and recorded with count zero. Count is the original delivery snapshot; account deletion can reduce surviving recipient rows without rewriting history.
- Revoke targets exactly one batch ID. It returns false if absent, true if present, preserves the first revocation time and emits no repeated metadata change on retry.

## Realtime Handoff

**Main agent modal API:** call `get_notification_batch_details` with
`{p_batch_id: batchId}` on modal open and invalidation. It requires an active admin,
including when the ID is missing; authorized missing/null IDs return null. The JSON
contains exactly `id` (bigint), `title`/`message` (text), `created_at` (timestamp),
`is_direct` (boolean), `recipient_count` (integer original snapshot), `revoked_at`
(nullable timestamp), `legacy` (boolean), and `remaining_count`/`read_count`/`unread_count`
(numeric counts). Counts cover all surviving recipient rows, including blocked users
and revoked batches, not merely the current recipient page. `remaining_count` means
surviving deliveries, not unread deliveries; it equals `read_count + unread_count`.
Deleted deliveries reduce these aggregates but not the original `recipient_count`.
An empty surviving audience returns zero counts. Keep the existing paginated recipient
RPC for rows; do not derive modal aggregates from its page. No frontend was edited here.

**Main agent: subscribe to `notification_recipients` INSERT and `notification_batch_events` UPDATE, not `notification_batches` UPDATE.**

`notification_batch_events(batch_id bigint, revoked_at timestamptz)` is a deliberately
content-free metadata table. It is updated atomically by revoke. Authenticated users can
SELECT only their own recipient metadata and event metadata for batches they received;
active admins can SELECT all event metadata. Authorization continues after revocation,
so the UPDATE is not hidden by RLS. No direct client writes are granted on any new table.
Batch content has no client SELECT grant or policy and is never published.

- Subscribe to recipients INSERT with `recipient_id=eq.<auth user UUID>`. Invalidate/refetch inbox, unread count and direct-popup candidates through RPCs; don't use event payloads as notification content.
- Subscribe to events UPDATE without a per-recipient filter (this table has no recipient ID). RLS filters authorized batch events server-side. Refetch inbox/count on each event. Admins refetch batch history too.
- Recipient UPDATE can optionally synchronize acknowledgments across tabs. Alternatively invalidate locally after acknowledgment and refetch on focus/reconnect. Realtime events are hints, not durable delivery guarantees.
- Primary-key replica identity is sufficient: recipients INSERT needs no old row and metadata UPDATE carries the new `batch_id`/`revoked_at`. No `REPLICA IDENTITY FULL` or broadcast authorization setup is needed.
- The migration adds the two metadata tables to an existing `supabase_realtime` publication and removes legacy notifications. If that publication is absent locally, SQL still applies; production must have it configured. It does not alter publication-wide event settings; ensure INSERT and UPDATE are enabled.
- Refetch on initial load, reconnect and window focus, and after local mutations. Revoke removes content from future RPC results but cannot erase content already displayed/cached on a device.

References checked: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes),
[replica identity](https://supabase.com/docs/guides/database/replication/pipelines-faq#how-does-replica-identity-affect-updates-and-deletes).

## Migration And Rollout

1. Back up and rehearse against a disposable copy of the actual schema. This repository's migration history is not a complete empty-database bootstrap.
2. Pause/drain legacy notification writers before applying. The migration locks the legacy table and commits schema, copy, ACLs, RPCs and publication changes atomically. A writer already executing an old function body is why draining matters.
3. Run the migration through the normal migration pipeline, not this agent. The supplied live counts (679 profiles, 3774 notifications) were not independently queried or hardcoded.
4. Verify counts and field preservation with the SQL below. Each legacy row becomes one `legacy=true` batch and one delivery with the same numeric ID, timestamps, recipient, sender, read/revoked state and direct flag. Similar content/timestamps are never grouped. Identity sequences advance beyond copied IDs.
5. Deploy the RPC-based clients and new Realtime subscriptions. Old send/revoke RPCs now raise `0A000` with a refresh instruction; legacy table client privileges, including column-level UPDATE, are removed. The old table remains an inaccessible archive for verification, not a live mirror.
6. Smoke-test authenticated recipient/admin/blocked sessions and Realtime on a disposable Supabase instance before production rollout. Do not revert by enabling old RPCs: new sends exist only in the batch model.

The upgrade now checks prerequisite tables, authorization helpers and legacy notification
columns before creating objects, raising `55000` with remediation if absent. It does not
rewrite old migrations or synthesize a production baseline. In particular, prerequisites
used by earlier migrations cannot be repaired retroactively by this later migration;
restore the established baseline before replaying those migrations. The disposable
test bootstrap is the only fixture bootstrap and must never run on production.

```sql
select (select count(*) from public.notifications) as legacy_rows,
       (select count(*) from public.notification_batches where legacy) as legacy_batches,
       (select count(*) from public.notification_recipients r
        join public.notification_batches b on b.id=r.batch_id where b.legacy) as legacy_deliveries;

-- Expected zero immediately after migration, before acknowledgments/revokes.
select count(*) as mismatches
from public.notifications n
left join public.notification_batches b on b.id=n.id
left join public.notification_recipients r on r.id=n.id
where b.id is null or r.id is null or not b.legacy or b.recipient_count <> 1
  or b.title <> n.title or b.message <> n.message or b.sender_id <> n.sender_id
  or b.created_at <> n.created_at or b.revoked_at is distinct from n.revoked_at
  or (b.audience_mode='selected') <> n.is_direct or r.batch_id <> n.id
  or r.recipient_id <> n.recipient_id or r.read_at is distinct from n.read_at
  or r.created_at <> n.created_at;
```

## Regression Tests

Run only in a **disposable empty PostgreSQL database**, never production. The bootstrap
uses minimal schema fixtures and deliberately creates roles/tables. The regression
script rolls its test mutations back but the bootstrap and migration persist.

```powershell
psql "$env:NOTIFICATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/notification_batches_bootstrap.sql
psql "$env:NOTIFICATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260909210000_notification_batches.sql
psql "$env:NOTIFICATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/notification_batches.sql
```

Executed locally using PGlite's embedded PostgreSQL engine: bootstrap PASS, migration
PASS, regression assertions PASS. A separate run with a pre-existing publication also
passed and confirmed only `notification_recipients` and `notification_batch_events`
remained in that fixture's publication. No application dependencies were modified; PGlite was
installed only in the pre-approved temporary directory. Assertions cover legacy mapping,
IDs, fields, ACLs/column grants, anonymous execution privilege, selected validation,
canonical retry, snapshot retries after status change, sender scoping, invalid-send
atomicity, exact revoke, server-time/idempotent acknowledgment, foreign acknowledgment,
revoked-row exclusion, RLS visibility after revoke, direct/unread filters, tied-timestamp
pagination, literal search/totals, blocked users/admins, and legacy refresh errors.
Additional assertions cover UUID substring search and blocked-ID exclusion, ten accepted
new sends, eleventh-send rejection without partial data, retry bypass and mismatch at the
limit, no refund on revoke, legacy/expired exclusion, independent sender budgets and a
slot reopening after expiration. Window tests age fixture timestamps rather than sleep.

Latest PGlite rerun: the complete bootstrap, migration and regression script passed both
without and with an existing `supabase_realtime` publication. The latter contained exactly
the two metadata tables afterward. Separate negative runs against an empty database and
a fixture missing `notifications.revoked_at` both raised the expected `55000`; rollback
left no `notification_batches` table. These negative runs do not certify the full historic
migration chain as an empty-database bootstrap.

Residual integration checks (not proven by embedded single-session tests):

Acknowledgment now captures the IDs returned by the ordered `FOR SHARE` lock query and
restricts the later UPDATE to that exact array (empty array means no updates). Newly
committed sends visible only to the UPDATE cannot enter its scope. SQL regression tests
simulate the statement interleaving by transactionally instrumenting the function to
insert a delivery after lock capture and before UPDATE, then roll back the instrumentation.
This tests the scope fix, including a nonempty and empty lock set, but is not a real
multi-session concurrency test. Detail RPC tests cover the exact JSON contract, missing
IDs, legacy/revoked data, mixed read states, blocked recipients, empty surviving audience,
original-count retention, and denial for ordinary users, blocked admins and anon.
The complete expanded suite passed in PGlite both with and without an existing publication.
A mutation run removing only the locked-ID UPDATE predicate failed at
`mark-all excludes newly visible unlocked batch`, confirming the regression detects this bug.

1. Two PostgreSQL sessions send the same sender/key concurrently: one waits and both return the same ID; only one fan-out exists. Repeat with differing payloads: the second raises `22023` after the first commits. Repeat with first transaction rollback: the second creates exactly one committed batch.
   Also seed nine recent sends and race two different keys for the same sender: exactly
   one must succeed and one must receive the rate-limit error. PGlite is single-session
   and does not prove concurrent lock behavior.
2. Concurrent revoke/ack in both lock orders: if revoke acquires its batch lock first, acknowledgment must not write read_at; if acknowledgment wins, its earlier acknowledgment may persist. Test mark-all against multiple batches as well.
3. Actual Supabase Realtime recipients INSERT and metadata UPDATE delivery, blocked/foreign subscriber exclusion, reconnect refetch and admin invalidation. SQL RLS tests do not exercise WebSocket delivery.
4. Rehearse against the full real schema, including auth/profile triggers and deployment ACL defaults; inspect query plans at production scale. At current supplied counts, legacy copy creates 3774 batches, 3774 recipients and 3774 small event rows.
