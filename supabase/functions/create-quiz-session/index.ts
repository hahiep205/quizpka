import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const examFiles: Record<string, string> = {
  "data-science-ai-midterm-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_midle.json",
  "data-science-ai-final-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_final.json",
}

function headers(req: Request) {
  return { "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" }
}
function json(body: unknown, status: number, req: Request) { return Response.json(body, { status, headers: headers(req) }) }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req)
  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401, req)
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: "Authentication required" }, 401, req)
    const input = await req.json().catch(() => null) as { examId?: unknown; idempotencyKey?: unknown } | null
    const examId = typeof input?.examId === "string" ? input.examId : ""
    const idempotencyKey = typeof input?.idempotencyKey === "string" && input.idempotencyKey.length >= 16 && input.idempotencyKey.length <= 100 ? input.idempotencyKey : ""
    const objectPath = examFiles[examId]
    if (!objectPath || !idempotencyKey) return json({ error: "Invalid session request" }, 400, req)
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) return json({ error: "Unable to verify account" }, 500, req)
    if (profile.status !== "active") return json({ error: "Account is blocked" }, 403, req)
    const { data: purchase, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", "dsai101").eq("status", "paid").maybeSingle()
    if (purchaseError) return json({ error: "Unable to verify entitlement" }, 500, req)
    if (!purchase) return json({ error: "Purchase required" }, 403, req)
    const { data: existing, error: existingError } = await admin.from("quiz_sessions").select("id,exam_id,subject_id,started_at,expires_at,status,result").eq("user_id", user.id).eq("exam_id", examId).eq("idempotency_key", idempotencyKey).maybeSingle()
    if (existingError) throw existingError
    if (existing) {
      const { data: existingFile, error: existingDownloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
      if (existingDownloadError || !existingFile) return json({ error: "Question bank unavailable" }, 503, req)
      const existingBank = await existingFile.json() as { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; explainAnswer?: string }> }
      const existingQuestions = (existingBank.questions ?? []).map((question) => ({ id: String(question.id), prompt: question.question, options: Object.keys(question.options ?? {}).sort().map((key) => question.options?.[key] ?? ""), explanation: question.explainAnswer }))
      return json({ sessionId: existing.id, examId: existing.exam_id, subjectId: existing.subject_id, startedAt: existing.started_at, expiresAt: existing.expires_at, status: existing.status, result: existing.result, questions: existingQuestions }, 200, req)
    }
    const { data: file, error: downloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
    if (downloadError || !file) return json({ error: "Question bank unavailable" }, 503, req)
    const bank = await file.json() as { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; answer: string; explainAnswer?: string }> }
    const sourceQuestions = Array.isArray(bank.questions) ? bank.questions : []
    const sessionId = crypto.randomUUID()
    const durationMinutes = 60
    const sessionQuestions = sourceQuestions.map((question, position) => {
      const keys = Object.keys(question.options ?? {}).sort()
      const correctIndex = keys.indexOf(question.answer)
      return {
        session_id: sessionId,
        position,
        question_id: String(question.id),
        correct_index: correctIndex >= 0 ? correctIndex : null,
        accepted_answers: correctIndex >= 0 ? [] : [question.answer.trim().toLowerCase()],
      }
    })
    const startedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString()
    const { error: sessionError } = await admin.from("quiz_sessions").insert({ id: sessionId, user_id: user.id, exam_id: examId, subject_id: "khoa-hoc-du-lieu-va-tri-tue-nhan-tao", duration_minutes: durationMinutes, idempotency_key: idempotencyKey, started_at: startedAt, expires_at: expiresAt })
    if (sessionError) throw sessionError
    const { error: questionsError } = await admin.from("quiz_session_questions").insert(sessionQuestions)
    if (questionsError) throw questionsError
    const displayQuestions = sourceQuestions.map((question) => ({ id: String(question.id), prompt: question.question, options: Object.keys(question.options ?? {}).sort().map((key) => question.options?.[key] ?? ""), explanation: question.explainAnswer }))
    return json({ sessionId, examId, subjectId: "khoa-hoc-du-lieu-va-tri-tue-nhan-tao", startedAt, expiresAt, status: "active", questions: displayQuestions }, 200, req)
  } catch (error) {
    console.error("Create quiz session failed", error)
    return json({ error: "Unable to create quiz session" }, 500, req)
  }
})
