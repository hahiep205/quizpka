// get-leaderboard — bounded read of the shared 30-minute top-10 snapshot.
//
// Vụ spam 2026-09-29: 1 user bắn ~300 req full-scan user_learning_stats
// trong ~2 phút bằng Python-urllib/Deno. Function này thay thế việc client
// SELECT trực tiếp PostgREST:
//   - Rate-limit fail-closed theo IP và user trước khi truy vấn dữ liệu.
//   - DB read chỉ qua service-role RPC đọc snapshot 10 dòng; clients không được SELECT
//     hoặc gọi RPC leaderboard trực tiếp.
//   - Response private/no-store; điểm cá nhân được lấy qua RPC riêng có auth.
//   - Acc bị block (profiles.status <> 'active') bị 403 ngay.
//
// Self-contained (không import ../_shared) để deploy qua API upload không
// phụ thuộc cấu trúc thư mục; các helper mirror từ _shared/edge-guard.ts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PRODUCTION_ORIGINS = [
  "https://quizpka.online",
  "https://www.quizpka.online",
]

function isAllowedOrigin(origin: string): boolean {
  if (PRODUCTION_ORIGINS.includes(origin)) return true
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://[::1]")
  ) return true
  return false
}

function corsHeaders(req: Request, extra: Record<string, string> = {}): Record<string, string> {
  const origin = req.headers.get("origin") ?? ""
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...extra,
  }
  if (origin && isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin
  return headers
}

function jsonWithCors(
  req: Request,
  body: unknown,
  status: number,
  extra: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: corsHeaders(req, extra) })
}

function clientIp(req: Request): string {
  const cloudflare = req.headers.get("cf-connecting-ip")?.trim()
  if (cloudflare) return cloudflare.slice(0, 64)
  const real = req.headers.get("x-real-ip")?.trim()
  if (real) return real.slice(0, 64)
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwarded) return forwarded.slice(0, 64)
  return "unknown"
}

function tooMany(req: Request, windowSeconds: number): Response {
  return jsonWithCors(req, { error: "Too many requests, please slow down" }, 429, {
    "Retry-After": String(windowSeconds),
    "Cache-Control": "private, no-store",
  })
}

function unavailable(req: Request): Response {
  return jsonWithCors(req, { error: "Leaderboard temporarily unavailable" }, 503, {
    "Retry-After": "30",
    "Cache-Control": "private, no-store",
  })
}

// Fail closed: a limiter outage must never turn off the abuse gate.
async function rateGate(
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
    })
    if (error) return unavailable(req)
    if (data === true) return null
    return tooMany(req, windowSeconds)
  } catch {
    return unavailable(req)
  }
}

// Mirror _shared/edge-guard.ts#getUserWithTimeout.
async function getUserWithTimeout(
  // deno-lint-ignore no-explicit-any
  userClient: any,
  accessToken: string,
  timeoutMs = 8000,
): Promise<{ id: string } | null> {
  let timer: number | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Auth verification timed out")), timeoutMs)
    })
    const result = await Promise.race([userClient.auth.getUser(accessToken), timeout]) as {
      data: { user: { id: string } | null }
    }
    return result.data.user ?? null
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

type Row = Record<string, unknown>

// Không cache trung gian; clients dùng snapshot/cache 30 phút ở tầng ứng dụng.
function cacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "private, no-store",
    "Vary": "Origin",
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") {
    return jsonWithCors(req, { error: "Method not allowed" }, 405, cacheHeaders())
  }

  try {
    const declaredLength = Number(req.headers.get("content-length"))
    if (Number.isFinite(declaredLength) && declaredLength > 1024) {
      return jsonWithCors(req, { error: "Request body too large" }, 413, cacheHeaders())
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const ip = clientIp(req)

    // Lớp 1: pre-auth gate theo IP — rớt flood trước khi tốn verify JWT.
    const ipGate = await rateGate(admin, req, `leaderboard:ip:${ip}`, 600, 60)
    if (ipGate) return ipGate

    const auth = req.headers.get("Authorization")
    const accessToken = auth?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!accessToken) return jsonWithCors(req, { error: "Authentication required" }, 401, cacheHeaders())
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!)
    const user = await getUserWithTimeout(userClient, accessToken).catch(() => null)
    if (!user) return jsonWithCors(req, { error: "Authentication required" }, 401, cacheHeaders())

    // Lớp 2: per-user gate — chính rào chặn kiểu spam 300 req/2 phút.
    const userGate = await rateGate(admin, req, `leaderboard:user:${user.id}`, 30, 60)
    if (userGate) return userGate

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > 1024) {
      return jsonWithCors(req, { error: "Request body too large" }, 413, cacheHeaders())
    }
    try { JSON.parse(rawBody) } catch { return jsonWithCors(req, { error: "Invalid request" }, 400, cacheHeaders()) }

    const { data, error } = await admin.rpc("get_leaderboard_top10_snapshot", { p_user_id: user.id })
    if (error) {
      if (error.code === "42501") return jsonWithCors(req, { error: "Account is blocked" }, 403, cacheHeaders())
      throw error
    }
    return jsonWithCors(req, (data ?? { computed_at: null, entries: [] }) as Row, 200, cacheHeaders())
  } catch {
    return unavailable(req)
  }
})
