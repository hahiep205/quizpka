import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { clientIp, corsHeaders, logServerError, rateGate, readJsonBody, requestBodyLimit } from "../_shared/edge-guard.ts"

const cors = { "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
function json(body: unknown, status: number, req?: Request) { return Response.json(body, { status, headers: req ? corsHeaders(req) : cors }) }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  try {
    const bodyLimit = requestBodyLimit(req, 64 * 1024)
    if (bodyLimit) return bodyLimit
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const ipGate = await rateGate(admin, req, `quiz:submit:ip:${clientIp(req)}`, 30, 600, true)
    if (ipGate) return ipGate
    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401)
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: "Authentication required" }, 401)
    const input = await readJsonBody(req, 64 * 1024) as { sessionId?: unknown; answers?: unknown; idempotencyKey?: unknown } | null
    const sessionId = typeof input?.sessionId === "string" ? input.sessionId : ""
    const answers = input?.answers && typeof input.answers === "object" && !Array.isArray(input.answers) ? input.answers as Record<string, unknown> : null
    const idempotencyKey = typeof input?.idempotencyKey === "string" && input.idempotencyKey.length >= 16 && input.idempotencyKey.length <= 100 ? input.idempotencyKey : ""
    if (!sessionId || !answers || !idempotencyKey || Object.keys(answers).length > 1000) return json({ error: "Invalid submission" }, 400, req)
    const userGate = await rateGate(admin, req, `quiz:submit:user:${user.id}`, 30, 3600, true)
    if (userGate) return userGate
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) return json({ error: "Unable to verify account" }, 500)
    if (profile.status !== "active") return json({ error: "Account is blocked" }, 403)
    const { data: session, error: sessionError } = await admin.from("quiz_sessions").select("id,user_id,exam_id,subject_id,status,started_at,expires_at,result").eq("id", sessionId).eq("user_id", user.id).single()
    if (sessionError || !session) return json({ error: "Quiz session not found" }, 404, req)
    if (session.status !== "active") return json(session.result ?? { error: "Quiz session is already submitted" }, session.result ? 200 : 409, req)
    const { data: sessionQuestions, error: questionsError } = await admin.from("quiz_session_questions").select("question_id,correct_index,accepted_answers").eq("session_id", sessionId)
    if (questionsError) throw questionsError
    if (Object.keys(answers).length > (sessionQuestions?.length ?? 0)) return json({ error: "Invalid submission" }, 400, req)
    const expired = Date.now() > Date.parse(session.expires_at)
    let correct = 0
    for (const question of sessionQuestions ?? []) {
      const answer = answers[question.question_id]
      if (question.correct_index !== null && Number.isInteger(answer) && answer === question.correct_index) correct += 1
      if (question.correct_index === null && typeof answer === "string" && question.accepted_answers.includes(answer.trim().toLowerCase())) correct += 1
    }
    const total = sessionQuestions?.length ?? 0
    const accuracy = total ? Math.round((correct / total) * 100) : 0
    const score = total ? Math.round((correct / total) * 10 * 10) / 10 : 0
    const startedAt = Date.parse(session.started_at ?? "")
    const durationSeconds = Number.isFinite(startedAt) ? Math.max(0, Math.min(86400, Math.floor((Date.now() - startedAt) / 1000))) : 0
    const { data: attempt, error: recordError } = await admin.rpc("record_verified_attempt", { p_session_id: sessionId, p_correct: correct, p_total: total, p_duration_seconds: durationSeconds, p_score: score, p_accuracy: accuracy })
    if (recordError) throw recordError
    return json({ attempt, correct, total, accuracy, score, expired }, 200, req)
  } catch {
    logServerError("quiz_session_submit_failed")
    return json({ error: "Unable to submit quiz session" }, 500, req)
  }
})
