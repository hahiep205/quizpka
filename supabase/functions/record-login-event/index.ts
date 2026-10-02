import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, getUserWithTimeout, rateGate, requestBodyLimit } from "../_shared/edge-guard.ts"

function observedIp(req: Request): string {
  const direct = req.headers.get("cf-connecting-ip")?.trim()
  if (direct) return direct.slice(0, 64)
  const real = req.headers.get("x-real-ip")?.trim()
  if (real) return real.slice(0, 64)
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded ? forwarded.slice(0, 64) : "unknown"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(req) })

  const bodyLimit = requestBodyLimit(req, 4 * 1024)
  if (bodyLimit) return bodyLimit

  try {
    const authorization = req.headers.get("Authorization")
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? ""
    if (!bearer) return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders(req) })

    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    })
    const user = await getUserWithTimeout(userClient, bearer, 8000).catch(() => null)
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders(req) })

    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const gate = await rateGate(admin, req, `login-event:user:${user.id}`, 10, 3600, true)
    if (gate) return gate
    const body = await req.json().catch(() => null) as { provider?: unknown } | null
    const provider = typeof body?.provider === "string" ? body.provider.slice(0, 80) : null
    const userAgent = req.headers.get("user-agent")?.slice(0, 1000) ?? null
    const { error } = await admin.from("user_login_events").insert({
      user_id: user.id,
      logged_in_at: new Date().toISOString(),
      ip_address: observedIp(req),
      user_agent: userAgent,
      provider,
    })
    if (error) throw error
    return Response.json({ ok: true }, { status: 200, headers: corsHeaders(req) })
  } catch {
    // Login must continue even when observability storage is temporarily unavailable.
    return Response.json({ error: "Unable to record login event" }, { status: 500, headers: corsHeaders(req) })
  }
})
