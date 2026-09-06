import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const examFiles: Record<string, string> = {
  "data-science-ai-midterm-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_midle.json",
  "data-science-ai-final-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_final.json",
  "intro-data-science-ai-bank-1": "idsai101/nhap_mon_khdl_ttnt.json",
  "kinh-te-vi-mo-macro-bank-1": "mac102/kinh_te_vi_mo.json",
  "office-it-final-bank-1": "oit101/tin_hoc_van_phong.json",
}
const examProducts: Record<string, string> = {
  "data-science-ai-midterm-1": "dsai101",
  "data-science-ai-final-1": "dsai101",
  "intro-data-science-ai-bank-1": "idsai101",
  "software-quality-assessment-final-bank-1": "sqa101",
  "marketing-final-bank-1": "mar101",
  "kinh-te-vi-mo-macro-bank-1": "mac102",
  "office-it-final-bank-1": "oit101",
}
const sqaExamId = "software-quality-assessment-final-bank-1"
const marExamId = "marketing-final-bank-1"
const marFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json"]
const sqaFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json"]

type BankQuestion = { id: string | number; question: string; options?: Record<string, string>; answer: string; explainAnswer?: string }

async function loadMultiBank(admin: any, directory: string, files: string[]): Promise<{ questions: BankQuestion[] }> {
  const banks = await Promise.all(files.map(async (fileName) => {
    const { data: file, error } = await admin.storage.from("paid-question-banks").download(`${directory}/${fileName}`)
    if (error || !file) throw new Error("Question bank unavailable")
    return await file.json() as { questions?: BankQuestion[] }
  }))
  return { questions: banks.flatMap((item, bankIndex) => (item.questions ?? []).map((question) => ({ ...question, id: `${bankIndex}-${String(question.id)}` }))) }
}

function toDisplayQuestions(bank: { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; explainAnswer?: string }> }) {
  return (bank.questions ?? []).map((question) => ({ id: String(question.id), prompt: question.question, options: Object.keys(question.options ?? {}).sort().map((key) => question.options?.[key] ?? ""), explanation: question.explainAnswer }))
}

function headers(req: Request) {
  return { "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" }
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
    const productId = examProducts[examId]
    if ((!objectPath && examId !== sqaExamId && examId !== marExamId) || !productId || !idempotencyKey) return json({ error: "Invalid session request" }, 400, req)
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) return json({ error: "Unable to verify account" }, 500, req)
    if (profile.status !== "active") return json({ error: "Account is blocked" }, 403, req)
    const { data: purchase, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", productId).eq("status", "paid").maybeSingle()
    if (purchaseError) return json({ error: "Unable to verify entitlement" }, 500, req)
    if (!purchase) return json({ error: "Purchase required" }, 403, req)
    const { data: existing, error: existingError } = await admin.from("quiz_sessions").select("id,exam_id,subject_id,started_at,expires_at,status,result").eq("user_id", user.id).eq("exam_id", examId).eq("idempotency_key", idempotencyKey).maybeSingle()
    if (existingError) throw existingError
    if (existing) {
      if (examId === sqaExamId) {
        const existingBank = await loadMultiBank(admin, "sqa101", sqaFiles)
        return json({ sessionId: existing.id, examId: existing.exam_id, subjectId: existing.subject_id, startedAt: existing.started_at, expiresAt: existing.expires_at, status: existing.status, result: existing.result, questions: toDisplayQuestions(existingBank) }, 200, req)
      }
      if (examId === marExamId) {
        const existingBank = await loadMultiBank(admin, "mar101", marFiles)
        return json({ sessionId: existing.id, examId: existing.exam_id, subjectId: existing.subject_id, startedAt: existing.started_at, expiresAt: existing.expires_at, status: existing.status, result: existing.result, questions: toDisplayQuestions(existingBank) }, 200, req)
      }
      const { data: existingFile, error: existingDownloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
      if (existingDownloadError || !existingFile) return json({ error: "Question bank unavailable" }, 503, req)
      const existingBank = JSON.parse(await existingFile.text()) as { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; explainAnswer?: string }> }
      const existingQuestions = (existingBank.questions ?? []).map((question) => ({ id: String(question.id), prompt: question.question, options: Object.keys(question.options ?? {}).sort().map((key) => question.options?.[key] ?? ""), explanation: question.explainAnswer }))
      return json({ sessionId: existing.id, examId: existing.exam_id, subjectId: existing.subject_id, startedAt: existing.started_at, expiresAt: existing.expires_at, status: existing.status, result: existing.result, questions: existingQuestions }, 200, req)
    }
    let bank: { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; answer: string; explainAnswer?: string }> }
    if (examId === sqaExamId) {
      bank = await loadMultiBank(admin, "sqa101", sqaFiles)
    } else if (examId === marExamId) {
      bank = await loadMultiBank(admin, "mar101", marFiles)
    } else {
      const { data: file, error: downloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
      if (downloadError || !file) return json({ error: "Question bank unavailable" }, 503, req)
      bank = JSON.parse(await file.text())
    }
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
    const subjectId = productId === "sqa101" ? "danh-gia-va-kiem-dinh-chat-luong-phan-mem" : productId === "idsai101" ? "nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao" : productId === "mar101" ? "marketing-can-ban" : productId === "mac102" ? "kinh-te-vi-mo-macro" : productId === "oit101" ? "tin-hoc-van-phong" : "khoa-hoc-du-lieu-va-tri-tue-nhan-tao"
    const { error: sessionError } = await admin.from("quiz_sessions").insert({ id: sessionId, user_id: user.id, exam_id: examId, subject_id: subjectId, duration_minutes: durationMinutes, idempotency_key: idempotencyKey, started_at: startedAt, expires_at: expiresAt })
    if (sessionError) throw sessionError
    const { error: questionsError } = await admin.from("quiz_session_questions").insert(sessionQuestions)
    if (questionsError) throw questionsError
    const displayQuestions = sourceQuestions.map((question) => ({ id: String(question.id), prompt: question.question, options: Object.keys(question.options ?? {}).sort().map((key) => question.options?.[key] ?? ""), explanation: question.explainAnswer }))
    return json({ sessionId, examId, subjectId, startedAt, expiresAt, status: "active", questions: displayQuestions }, 200, req)
  } catch (error) {
    console.error("Create quiz session failed", error)
    return json({ error: "Unable to create quiz session" }, 500, req)
  }
})
