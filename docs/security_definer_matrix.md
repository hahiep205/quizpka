# SECURITY DEFINER Matrix

This matrix is generated from the production `public` schema and must be kept
aligned with the database after each RPC migration.

| Category | Caller | Required controls | Current decision |
|---|---|---|---|
| Service-only | `service_role` | `search_path`, no client execute | `record_verified_attempt`, `complete_paid_order`, cleanup/retention functions |
| User-scoped read/write | `authenticated` | `auth.uid()`, active-user check, bounded input/output | activity, free attempt, notification/profile RPCs |
| Admin-scoped | `authenticated` | mandatory `is_admin()` inside function, bounded input/output | admin user/payment/support/notification RPCs |
| Public helper | `authenticated` | no sensitive writes, bounded output | product access, leaderboard and notification reads |

## Review Rules

- Revoke `anon` from every SECURITY DEFINER write function unless anonymous
  access is explicitly required.
- Revoke `authenticated` from service-only functions.
- Every SECURITY DEFINER function sets a fixed `search_path`.
- Functions accepting a user ID must compare it with `auth.uid()` or verify
  `is_admin()` before using it.
- All list/search functions clamp limits and offsets.
- All write functions have idempotency or a transaction-level quota where
  retries can create rows or expensive work.

## Known Intentional Findings

Supabase's advisor reports authenticated execution for several user/admin RPCs.
Those functions remain executable because the application calls them directly;
each must satisfy the controls above. Service-only functions are explicitly
revoked from `anon` and `authenticated` in migrations.
