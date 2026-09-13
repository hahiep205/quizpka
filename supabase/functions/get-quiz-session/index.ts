import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
})

const json = (body: unknown, status: number, req: Request) => Response.json(body, { status, headers: cors(req) })
const examFiles: Record<string, string> = {
  "data-science-ai-midterm-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_midle.json",
  "data-science-ai-final-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_final.json",
  "intro-data-science-ai-bank-1": "idsai101/nhap_mon_khdl_ttnt.json",
  "kinh-te-vi-mo-macro-bank-1": "mac102/kinh_te_vi_mo.json",
  "office-it-final-bank-1": "oit101/tin_hoc_van_phong.json",
  "finance-final-bank-1": "fin101/nguyen_ly_tai_chinh.json",
  "world-civilization-chapters-1-2-bank-1": "civ101/lich_su_van_minh_the_gioi.json",
  "economics-bank-1": "eco101/kinh_te_hoc.json",
  "phap-luat-dai-cuong-bank-1": "law101/phap_luat_dai_cuong.json",
  "hcm-final-bank-1": "hcm101/tu_tuong_hcm.json",
  "management-final-bank-1": "mgt101/quan_tri_hoc.json",
  "philosophy-3-credit-final-bank-1": "mln102/triet_hoc_mln_3tc.json",
  "political-economy-final-bank-1": "pec101/kinh_te_chinh_tri.json",
  "philosophy-2-credit-final-bank-1": "mln101/triet_hoc_mln_2tc.json",
  "history-party-final-bank-1": "his101/lich_su_dang.json",
  "scientific-socialism-final-bank-1": "soc101/chu_nghia_xa_hoi.json",
  "discrete-math-quiz-bank-1": "dm101/toan_roi_rac_quiz.json",
  "english-1-final-bank-1": "ta101/tieng_anh_1_quiz.json",
  "research-methodology-final-bank-1": "rm101/phuong_phap_nghien_cuu.json",
  "nghien-cuu-khoa-hoc-trong-kinh-te-final-bank-1": "rm102/nghien_cuu_khoa_hoc_trong_kinh_te.json",
  "english-paid-test02-bank-1": "tadv02/test02.json",
  "english-paid-test03-bank-1": "tadv02/test03.json",
  "english-paid-test04-bank-1": "tadv02/test04.json",
  "english-paid-test05-bank-1": "tadv02/test05.json",
  "english-paid-test06-bank-1": "tadv02/test06.json",
}
const sqaFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json"]
const marFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json", "chuong_7.json", "chuong_8.json", "chuong_9.json"]
const sqaExamId = "software-quality-assessment-final-bank-1"
const marExamId = "marketing-final-bank-1"

function flattenBankParts(bank: { questions?: any[]; parts?: Array<{ questions?: any[] }> }): any[] {
  if (Array.isArray(bank.questions) && bank.questions.length) return bank.questions
  if (Array.isArray(bank.parts)) return bank.parts.flatMap((part) => part.questions ?? [])
  return bank.questions ?? []
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req)

  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401, req)
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: "Authentication required" }, 401, req)

    const input = await req.json().catch(() => null) as { sessionId?: unknown } | null
    const sessionId = typeof input?.sessionId === "string" ? input.sessionId : ""
    if (!sessionId) return json({ error: "Invalid session" }, 400, req)

    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) return json({ error: "Unable to verify account" }, 500, req)
    if (profile.status !== "active") return json({ error: "Account is blocked" }, 403, req)

    const { data: session, error: sessionError } = await admin
      .from("quiz_sessions")
      .select("id,exam_id,subject_id,status,started_at,expires_at,result")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single()
    if (sessionError || !session) return json({ error: "Quiz session not found" }, 404, req)

    let status = session.status
    if (status === "active" && Date.parse(session.expires_at) <= Date.now()) {
      const { error: expireError } = await admin
        .from("quiz_sessions")
        .update({ status: "expired", last_seen_at: new Date().toISOString() })
        .eq("id", session.id)
        .eq("status", "active")
      if (expireError) throw expireError
      status = "expired"
    } else {
      const { error: seenError } = await admin.from("quiz_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id)
      if (seenError) throw seenError
    }

    let questions = null
    if (status === "active") {
      const objectPath = examFiles[session.exam_id]
      if (!objectPath && session.exam_id !== sqaExamId && session.exam_id !== marExamId) return json({ error: "Unknown exam" }, 400, req)
      let bank: { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; explainAnswer?: string }> }
      if (session.exam_id === sqaExamId || session.exam_id === marExamId) {
        const directory = session.exam_id === marExamId ? "mar101" : "sqa101"
        const files = session.exam_id === marExamId ? marFiles : sqaFiles
        const banks = await Promise.all(files.map(async (fileName) => {
          const { data: file, error } = await admin.storage.from("paid-question-banks").download(`${directory}/${fileName}`)
          if (error || !file) throw new Error("Question bank unavailable")
          return await file.json() as { questions?: Array<{ id: string | number; question: string; options?: Record<string, string>; explainAnswer?: string }> }
        }))
        bank = { questions: banks.flatMap((item) => item.questions ?? []) }
      } else {
        const { data: file, error: downloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
        if (downloadError || !file) return json({ error: "Question bank unavailable" }, 503, req)
        bank = JSON.parse(await file.text())
      }
      questions = flattenBankParts(bank).map((question) => ({ id: String(question.id), prompt: question.question, options: Object.keys(question.options ?? {}).sort().map((key) => question.options?.[key] ?? ""), explanation: question.explainAnswer }))
    }
    return json({
      sessionId: session.id,
      examId: session.exam_id,
      subjectId: session.subject_id,
      status,
      startedAt: session.started_at,
      expiresAt: session.expires_at,
      result: session.result,
      questions,
    }, 200, req)
  } catch (error) {
    console.error("Get quiz session failed", error)
    return json({ error: "Unable to load quiz session" }, 500, req)
  }
})
