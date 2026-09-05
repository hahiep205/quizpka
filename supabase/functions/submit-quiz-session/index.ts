import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
function json(body: unknown, status: number) { return Response.json(body, { status, headers: cors }) }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401)
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: "Authentication required" }, 401)
    const input = await req.json().catch(() => null) as { sessionId?: unknown; answers?: unknown; durationSeconds?: unknown } | null
    const sessionId = typeof input?.sessionId === "string" ? input.sessionId : ""
    const answers = input?.answers && typeof input.answers === "object" && !Array.isArray(input.answers) ? input.answers as Record<string, unknown> : null
    if (!sessionId || !answers) return json({ error: "Invalid submission" }, 400)
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) return json({ error: "Unable to verify account" }, 500)
    if (profile.status !== "active") return json({ error: "Account is blocked" }, 403)
    const { data: session, error: sessionError } = await admin.from("quiz_sessions").select("id,user_id,exam_id,subject_id,status,started_at,expires_at").eq("id", sessionId).eq("user_id", user.id).single()
    if (sessionError || !session) return json({ error: "Quiz session not found" }, 404)
    if (session.status !== "active") return json({ error: "Quiz session is already submitted" }, 409)
    const { data: sessionQuestions, error: questionsError } = await admin.from("quiz_session_questions").select("question_id,correct_index,accepted_answers").eq("session_id", sessionId)
    if (questionsError) throw questionsError
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
    return json({ attempt, correct, total, accuracy, score, expired }, 200)
  } catch (error) {
    console.error("Submit quiz session failed", error)
    return json({ error: "Unable to submit quiz session" }, 500)
  }
})
