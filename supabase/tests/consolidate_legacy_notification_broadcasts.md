# Legacy Broadcast Consolidation

Follow-up to `20260909210000_notification_batches.sql` (production version
`20260907143518`). The initial upgrade deliberately kept one batch per legacy
recipient. `20260909220000_consolidate_legacy_notification_broadcasts.sql` repairs
that history without changing frontend files or notification RPCs.

## Safety Rules

- Only `legacy = true AND audience_mode = 'all'` is eligible.
- Exact sender, title, message, full `timestamptz` creation time and exact nullable
  revocation time define a group. No rounding, time window or fuzzy content matching.
- Any duplicate recipient UUID within that group excludes the entire group.
- The smallest existing batch ID survives; its original recipient counts are summed.
- Recipient rows are reparented before redundant event and batch rows are deleted.
  No recipients are inserted/deleted, read times changed, or notifications revoked.
- In-transaction before/after comparisons abort on any recipient state or archive
  change. Each affected delivery must have its original identity in the archive.
- Batch, recipient and event EXCLUSIVE locks follow writer order and drain batch
  row-locking acknowledgments before reparenting. Ordinary reads remain available.
  Archive SHARE lock protects verification. Lock timeout is 5 seconds; statement
  timeout is 30 seconds. A failure rolls back the transaction; retry in a quiet window.
- Removed IDs are not aliased: existing detail RPC returns null, recipient list is
  empty and revoke returns false. Refresh an already-open admin history/modal.
- Reapplying the consolidation is a no-op. The original archive remains untouched,
  but it is not a live mirror of subsequent acknowledgments/revocations.

## Local Regression

Run the disposable in-memory PGlite test, never the fixture SQL on production:

```powershell
node supabase/tests/consolidate_legacy_notification_broadcasts.mjs "C:/Users/hahie/AppData/Local/Temp/opencode/node_modules/@electric-sql/pglite/dist/index.js"
```

Alternatively omit the module path when `@electric-sql/pglite` is already resolvable.
The test loads the existing bootstrap and actual upgrade and consolidation SQL.
It checks exact merges; microsecond/sender/title/message differences; direct/new
exclusion; duplicate recipients; separate null and two exact revocation timestamps;
preserved read state including a post-upgrade acknowledgment; archive preservation;
event cleanup; stale IDs; and idempotence. PGlite does not prove multi-session lock
behavior or Supabase WebSocket delivery.

## Production Evidence

Read-only inspection of `mbhzkugcfovdthjdjqtx` on 2026-09-07 found 3,774 batches,
recipients, events and archived notifications. Seven multi-batch exact broadcast
groups had 664, 664, 570, 560, 449, 448 and 397 recipients, with no duplicate
recipients and one revocation state each. One singleton broadcast remains separate.
The user's 19:46:18 UTC+07 example is exactly `2026-09-07 12:46:18.709025+00`
and has 664 recipients. The earlier `12:44:19.358662+00` send remains distinct.

Pre-apply archive MD5 (ordered full-row JSONB): `0f7c00518a01591a2cc438acdebe58e7`.
Pre-apply recipient-state MD5 (ordered JSONB arrays of ID, recipient UUID, read time,
creation time and effective batch revocation): `ddf87f58b264051f7f943e22375ac22f`.
Archive-to-recipient ID/recipient/creation mismatches: zero.
