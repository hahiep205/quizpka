// get-leaderboard — P2 edge cache cho BXH.
//
// Vụ spam 2026-09-29: 1 user bắn ~300 req full-scan user_learning_stats
// trong ~2 phút bằng Python-urllib/Deno. Function này thay thế việc client
// SELECT trực tiếp PostgREST:
//   - Server truy vấn 1 lần / 60s / limit (isolate-level cache), flood N user
//     chỉ tốn thêm các PK lookup rẻ tiền cho dòng "you".
//   - Rate-limit 2 lớp: theo IP (pre-auth) + theo user (post-auth), tái dùng
//     public.check_edge_rate_limit().
//   - Trình duyệt cache riêng 60s: Cache-Control public, max-age=60.
//     BẮT BUỘC kèm Vary: Authorization vì response chứa dòng của chính user
//     (kể cả khi ẩn) — không có Vary, cache dùng chung sẽ rò rỉ row private
//     của user A sang user B.
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
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwarded) return forwarded.slice(0, 64)
  const real = req.headers.get("x-real-ip")?.trim()
  if (real) return real.slice(0, 64)
  return "unknown"
}

function tooMany(req: Request, windowSeconds: number): Response {
  return jsonWithCors(req, { error: "Too many requests, please slow down" }, 429, {
    "Retry-After": String(windowSeconds),
  })
}

// Mirror _shared/edge-guard.ts#rateGate: fixed-window, fail-open on DB error.
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
    if (error) return null
    if (data === true) return null
    return tooMany(req, windowSeconds)
  } catch {
    return null
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

const LEADERBOARD_SELECT =
  "user_id,display_name,avatar_url,visible,subjects_reviewed,attempts,average_accuracy,total_duration_seconds,points,week_subjects_reviewed,week_attempts,week_average_accuracy,week_total_duration_seconds,week_points,month_subjects_reviewed,month_attempts,month_average_accuracy,month_total_duration_seconds,month_points"

const LIMIT_DEFAULT = 100
const LIMIT_MAX = 200
const CACHE_TTL_MS = 60_000

type Row = Record<string, unknown>

// Isolate-level cache: top visible rows dùng chung cho mọi user.
// Best-effort (mất khi isolate lạnh) — rào rate-limit DB mới là bảo vệ cứng.
const topCache = new Map<number, { at: number; rows: Row[] }>()

function clampLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(n)) return LIMIT_DEFAULT
  return Math.min(Math.max(Math.floor(n), 1), LIMIT_MAX)
}

// Header cache cho response: public 60s + Vary Authorization (xem chú thích đầu file).
function cacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=60",
    "Vary": "Origin, Authorization",
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") {
    return jsonWithCors(req, { error: "Method not allowed" }, 405, cacheHeaders())
  }

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const ip = clientIp(req)

    // Lớp 1: pre-auth gate theo IP — rớt flood trước khi tốn verify JWT.
    const ipGate = await rateGate(admin, req, `leaderboard:ip:${ip}`, 120, 60)
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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single()
    if (profileError) return jsonWithCors(req, { error: "Unable to verify account" }, 500, cacheHeaders())
    if (profile.status !== "active") return jsonWithCors(req, { error: "Account is blocked" }, 403, cacheHeaders())

    const input = await req.json().catch(() => null) as { limit?: unknown } | null
    const limit = clampLimit(input?.limit)

    let top = topCache.get(limit)
    if (!top || Date.now() - top.at > CACHE_TTL_MS) {
      const { data, error } = await admin
        .from("user_learning_stats")
        .select(LEADERBOARD_SELECT)
        .eq("visible", true)
        .order("points", { ascending: false })
        .limit(limit)
      if (error) throw error
      top = { at: Date.now(), rows: (data ?? []) as Row[] }
      topCache.set(limit, top)
    }

    // PK lookup rẻ tiền cho dòng "you" (kể cả khi ẩn).
    const { data: own } = await admin
      .from("user_learning_stats")
      .select(LEADERBOARD_SELECT)
      .eq("user_id", user.id)
      .maybeSingle()
    const rows: Row[] = [...top.rows]
    if (own && !top.rows.some((r) => r.user_id === (own as Row).user_id)) {
      rows.push(own as Row)
    }

    return jsonWithCors(req, rows, 200, cacheHeaders())
  } catch (error) {
    return jsonWithCors(req, { error: error instanceof Error ? error.message : "Unable to load leaderboard" }, 500, cacheHeaders())
  }
})
