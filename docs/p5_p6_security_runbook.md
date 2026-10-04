# P5-P8 Security Runbook

## P5 Application Guards

All P5 controls are enforced inside the application, Edge Functions and
database. No external infrastructure configuration is required.

- Rate-limit `get-paid-document` at 50 requests per 10 minutes/IP.
- Rate-limit `get-paid-question-bank` at 50 requests per 10 minutes/IP.
- Rate-limit `create-sepay-checkout` at 30 requests per hour/IP.
- Require user/resource gates after authentication.
- Reject request bodies above 64 KiB for quiz submit and 16 KiB for other JSON endpoints.
- Enforce payment webhook secret, freshness, dedupe, body limit and expiry checks in the function/database.
- Keep all private content behind authenticated Edge Functions and allowlisted object paths.
- Use fail-closed rate gates for expensive endpoints.

## P6 Abuse Test Matrix

Run only against staging or an approved test window:

- 200 document requests for one user/document.
- 100 bank requests with repeated and rotating resource keys.
- 1,100 activity events for one authenticated user.
- Oversized JSON bodies and malformed JSON.
- Duplicate webhook event IDs and transaction IDs.
- Expired pending orders and late payment callbacks.
- Repeated `submit_free_attempt` calls from one user (rate-limit + paid-subject rejects).

Expected results:

- 429/413 responses occur before Storage or expensive RPC work.
- Quiz submission integrity is enforced in the database (`submit_free_attempt`
  requires `is_active_user()`, is rate-limited and rejects paid subjects);
  there is no quiz-session edge surface anymore.
- Duplicate webhook callbacks are 2xx and do not duplicate purchases.
- Activity quota stops at 100/10 minutes and 1,000/day.
- No request body, token, signed URL or full payment payload appears in logs.

## Metrics

Track hourly: Egress, Storage reads, Edge Function invocations, 429/413/5xx,
rate-limit RPC failures, signed URL creation, pending order expiry, webhook
duplicates, activity quota rejections and P95 latency.

## P7 Internal Metrics

- Use `public.security_metrics_daily` for low-cardinality counters only.
- Metric keys must not contain user IDs, emails, tokens, URLs or payloads.
- Keep metrics for 90 days and prune them daily.
- Record aggregate counters such as `rate_limit_rejected`, `webhook_duplicate`,
  `activity_quota_rejected`, `checkout_expired` and `body_too_large`.

## P8 Operational Cleanup

- Expire pending orders every five minutes.
- Redact payment event payloads after 30 days.
- Delete payment event rows after 180 days.
- Delete rate-limit buckets older than seven days.
- Run cleanup functions only as `service_role` jobs.
- Verify cleanup job names and last-run status before changing retention.
