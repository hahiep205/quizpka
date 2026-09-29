// P1 shared edge guard: CORS whitelist, client IP, per-bucket rate limit,
// auth with timeout, and Cloudflare Turnstile verification.
// Imported via relative path (e.g. "../_shared/edge-guard.ts") — supported
// by `supabase functions deploy` bundling.

const PRODUCTION_ORIGINS = [
  "https://quizpka.online",
  "https://www.quizpka.online",
];

function isAllowedOrigin(origin: string): boolean {
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  // Local dev only.
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://[::1]")
  ) return true;
  return false;
}

/** CORS headers: only echo back whitelisted origins (never `*`, never raw echo). */
export function corsHeaders(req: Request, extra: Record<string, string> = {}): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    ...extra,
  };
  if (origin && isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function jsonWithCors(req: Request, body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: corsHeaders(req, extra) });
}

/** Best-effort client IP behind Supabase's edge proxy. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

function tooMany(req: Request, windowSeconds: number): Response {
  return jsonWithCors(req, { error: "Too many requests, please slow down" }, 429, {
    "Retry-After": String(windowSeconds),
  });
}

/**
 * Fixed-window rate gate backed by public.check_edge_rate_limit().
 * Fail-open on DB errors so a rate-table outage never locks out real users
 * (Cloudflare WAF from P0 remains the outer shield). Silent: no logging,
 * because floods would turn logs into a billing vector (see P0).
 */
export async function rateGate(
  // deno-lint-ignore no-explicit-any
  admin: any,
  req: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<Response | null> {
  try {
    const { data, error } = await admin.rpc("check_edge_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return null;
    if (data === true) return null;
    return tooMany(req, windowSeconds);
  } catch {
    return null;
  }
}

/**
 * supabase.auth.getUser with a hard timeout. Without this, a slow/hung Auth
 * response holds the isolate; under flood that multiplies invocations cost.
 */
export async function getUserWithTimeout(
  // deno-lint-ignore no-explicit-any
  userClient: any,
  accessToken: string,
  timeoutMs = 8000,
): Promise<{ id: string } | null> {
  let timer: number | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Auth verification timed out")), timeoutMs);
    });
    const result = await Promise.race([userClient.auth.getUser(accessToken), timeout]) as {
      data: { user: { id: string } | null };
    };
    return result.data.user ?? null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Verify a Cloudflare Turnstile token (checkout abuse gate).
 * - No TURNSTILE_SECRET_KEY configured → skipped (dev / pre-deploy), returns ok.
 * - Secret configured → token required and must verify; fail closed.
 */
export async function verifyTurnstile(
  token: string,
  ip: string,
  timeoutMs = 5000,
): Promise<{ ok: boolean; skipped: boolean }> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
  if (!secret) return { ok: true, skipped: true };
  if (!token || token.length > 4096) return { ok: false, skipped: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: ctrl.signal,
    });
    const payload = await res.json().catch(() => null) as { success?: boolean } | null;
    return { ok: payload?.success === true, skipped: false };
  } catch {
    return { ok: false, skipped: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Constant-time string compare (webhook secret; avoids timing oracle). */
export function secretsEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
