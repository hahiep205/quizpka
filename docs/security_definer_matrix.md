# SECURITY DEFINER Matrix

This matrix is generated from the production `public` schema and must be kept
aligned with the database after each RPC migration.

| Category | Caller | Required controls | Current decision |
|---|---|---|---|
| Service-only | `service_role` | `search_path`, no client execute | `record_verified_attempt`, `complete_paid_order`, cleanup/retention functions, `check_edge_rate_limit` (tightened 2026-10-04), `check_edge_rate_limits`, `increment_security_metric` |
| User-scoped read/write | `authenticated` | `auth.uid()`, active-user check, bounded input/output | activity, free attempt, notification/profile RPCs, `get_my_notification_digest` |
| Admin-scoped | `authenticated` | mandatory `is_admin()` inside function, bounded input/output | admin user/payment/support/notification RPCs, `admin_list_users`, `admin_list_events`, `admin_list_attempts`, `admin_list_orders` |
| Public helper | `authenticated` | no sensitive writes, bounded output | product access, leaderboard and notification reads |

## Review Rules

- Revoke `anon` from every SECURITY DEFINER write function unless anonymous
  access is required.
- Revoke `authenticated` from service-only functions.
- Every SECURITY DEFINER function sets a fixed `search_path`.
- Functions accepting a user ID must compare it with `auth.uid()` or verify
  `is_admin()` before using it.
- All list/search functions clamp limits and offsets.
- All write functions have idempotency or a transaction-level quota where
  retries can create rows or expensive work.

## 2026-10-04 log-cost RPC batch (migrations 20261004100000–20261004100200)

- `check_edge_rate_limits(jsonb)` — service-only multi-gate variant of
  `check_edge_rate_limit`; short-circuits at the first rejected gate so
  bucket consumption matches sequential `rateGate()` calls. Invalid gates
  raise `22023` (edge-guard maps RPC errors to the existing fail-open /
  fail-closed path).
- `check_edge_rate_limit(text, integer, integer)` — live ACL also granted
  `anon` + `authenticated` (created directly on prod, out-of-band grant);
  tightened back to `service_role` only. Frontend never calls it; SQL RPCs
  reach it under definer context.
- `get_my_notification_digest(boolean, bigint[], integer)` — user-scoped,
  `is_active_user()` gate, rows mirror `list_my_notifications`; dismissed-id
  filter is client intent (popup dismiss), capped at 100 ids.
- `admin_list_users / admin_list_events / admin_list_attempts /
  admin_list_orders` — admin-scoped read-only, `is_admin()` gate, all
  limits/offsets clamped, static CASE-based ORDER BY (whitelisted sort keys).

## Known Intentional Findings

Supabase's advisor reports authenticated execution for several user/admin RPCs.
Those functions remain executable because the application calls them directly;
each must satisfy the controls above. Service-only functions are explicitly
revoked from `anon` and `authenticated` in migrations.
