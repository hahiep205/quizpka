import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { clientIp, corsHeaders, getUserWithTimeout, logServerError, rateGate, rateGates, requestBodyLimit, readJsonBody } from "../_shared/edge-guard.ts"

// P1: CORS whitelist (was: echo any Origin). Contract unchanged (full bank
// JSON); Egress is cut by per-user/IP rate gates + private browser cache
// (banks are static) + the frontend in-memory bank cache.

const examFiles: Record<string, string> = {
  "data-science-ai-midterm-1": "dsai101/khoa_hoc_du_lieu_va_tri_tue_nhan_tao_middle.json",
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
  "business-statistics-quiz-bank-1": "sta201/thong_ke_kinh_doanh.json",
  "database-final-bank-1": "db101/co_so_du_lieu.json",
}
const subjectProducts: Record<string, string> = {
  "khoa-hoc-du-lieu-va-tri-tue-nhan-tao": "dsai101",
  "nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao": "idsai101",
  "danh-gia-va-kiem-dinh-chat-luong-phan-mem": "sqa101",
  "bao-mat-ung-dung-he-thong": "sec301",
  "marketing-can-ban": "mar101",
  "kinh-te-vi-mo-macro": "mac102",
  "tin-hoc-van-phong": "oit101",
  "nguyen-ly-tai-chinh": "fin101",
  "lich-su-van-minh-the-gioi": "civ101",
  "kinh-te-hoc": "eco101",
  "phap-luat-dai-cuong": "law101",
  "tu-tuong-ho-chi-minh": "hcm101",
  "quan-tri-hoc": "mgt101",
  "triet-hoc-mac-lenin-3tc": "mln102",
  "kinh-te-chinh-tri-mac-lenin": "pec101",
  "triet-hoc-mac-lenin-2tc": "mln101",
  "lich-su-dang-cong-san-viet-nam": "his101",
  "chu-nghia-xa-hoi-khoa-hoc": "soc101",
  "toan-roi-rac": "dm101",
  "tieng-anh-1": "ta101",
  "phuong-phap-nghien-cuu-khoa-hoc": "rm101",
  "nghien-cuu-khoa-hoc-trong-kinh-te": "rm102",
  "tadv-traphi": "tadv02",
  "thong-ke-trong-kinh-doanh": "sta201",
  "co-so-du-lieu": "db101",
  "ky-nang-khoi-nghiep-va-lanh-dao": "ent101",
  "ky-nang-quan-ly-du-an": "pm101",
}
const sqaFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json"]
const secFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json.gz", "chuong_7.json", "chuong_8.json"]
const marFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json", "chuong_7.json", "chuong_8.json", "chuong_9.json"]
const entFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json"]
const pmFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json", "chuong_7.json", "chuong_8.json"]
const bankCache = new Map<string, { body: string; etag: string }>()

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders(req) })
  try {
    const bodyLimit = requestBodyLimit(req, 16 * 1024)
    if (bodyLimit) return bodyLimit
    const authorization = req.headers.get("Authorization")
    if (!authorization) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: corsHeaders(req) })
    const input = await readJsonBody(req, 16 * 1024) as { examId?: unknown; subjectId?: unknown } | null
    const examId = typeof input?.examId === "string" ? input.examId : ""
    const subjectId = typeof input?.subjectId === "string" ? input.subjectId : ""
    const productId = subjectProducts[subjectId]
    if (!productId) return new Response(JSON.stringify({ error: "Unknown subject" }), { status: 400, headers: corsHeaders(req) })
    const objectPath = examFiles[examId]
    if (!objectPath && subjectId !== "danh-gia-va-kiem-dinh-chat-luong-phan-mem" && subjectId !== "bao-mat-ung-dung-he-thong" && subjectId !== "marketing-can-ban" && subjectId !== "ky-nang-khoi-nghiep-va-lanh-dao" && subjectId !== "ky-nang-quan-ly-du-an") return new Response(JSON.stringify({ error: "Unknown exam" }), { status: 400, headers: corsHeaders(req) })
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    // P1: pre-auth flood gate (shape already validated above, cheap reject).
    const ipGate = await rateGate(admin, req, `bank:ip:${clientIp(req)}`, 50, 600, true)
    if (ipGate) return ipGate
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? ""
    // P1: hard timeout so hung Auth responses can't pile up isolates under flood.
    const user = await getUserWithTimeout(userClient, bearer, 8000).catch(() => null)
    if (!user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: corsHeaders(req) })
    // P1: per-user gate — a scraper with a stolen token is capped at 120 banks/h.
    // Log-cost: user + resource gates share ONE check_edge_rate_limits
    // round-trip (the pre-auth IP gate above must stay its own earlier call).
    // On RPC backend error the merged call fails closed (strictest policy);
    // the standalone resource gate used to fail open.
    const gateResponse = await rateGates(admin, req, [
      { bucket: `bank:user:${user.id}`, limit: 20, windowSeconds: 3600, failClosed: true },
      { bucket: `bank:user:${user.id}:${subjectId}:${examId}`, limit: 20, windowSeconds: 3600, failClosed: false },
    ])
    if (gateResponse) return gateResponse
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError || profile.status !== "active") return new Response(JSON.stringify({ error: "Account is not active" }), { status: 403, headers: corsHeaders(req) })
    const { data: purchase, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", productId).eq("status", "paid").maybeSingle()
    if (purchaseError) throw purchaseError
    if (!purchase) return new Response(JSON.stringify({ error: "Purchase required" }), { status: 403, headers: corsHeaders(req) })
    // P1: banks are static — allow private browser caching to cut repeat Egress.
    const cacheHeaders = corsHeaders(req, { "Content-Type": "application/json", "Cache-Control": "private, max-age=86400" })
    const cacheKey = `${subjectId}:${examId}`
    const cached = bankCache.get(cacheKey)
    if (cached) {
      if (req.headers.get("if-none-match") === cached.etag) return new Response(null, { status: 304, headers: corsHeaders(req, { ETag: cached.etag, "Cache-Control": "private, max-age=86400" }) })
      return new Response(cached.body, { status: 200, headers: corsHeaders(req, { "Content-Type": "application/json", "Cache-Control": "private, max-age=86400", ETag: cached.etag }) })
    }
    if (objectPath) {
      const { data: file, error: downloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
      if (downloadError || !file) return new Response(JSON.stringify({ error: "Question bank unavailable" }), { status: 503, headers: corsHeaders(req) })
      const body = await file.text()
      const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(body))
      const etag = `"${Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}"`
      bankCache.set(cacheKey, { body, etag })
      if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...cacheHeaders, ETag: etag } })
      return new Response(body, { status: 200, headers: { ...cacheHeaders, ETag: etag } })
    }
    const files = subjectId === "bao-mat-ung-dung-he-thong" ? secFiles : subjectId === "marketing-can-ban" ? marFiles : subjectId === "ky-nang-khoi-nghiep-va-lanh-dao" ? entFiles : subjectId === "ky-nang-quan-ly-du-an" ? pmFiles : sqaFiles
    const directory = subjectId === "bao-mat-ung-dung-he-thong" ? "sec301" : subjectId === "marketing-can-ban" ? "mar101" : subjectId === "ky-nang-khoi-nghiep-va-lanh-dao" ? "ent101" : subjectId === "ky-nang-quan-ly-du-an" ? "pm101" : "sqa101"
    const banks = await Promise.all(files.map(async (fileName) => {
      const { data: file, error } = await admin.storage.from("paid-question-banks").download(`${directory}/${fileName}`)
      if (error || !file) throw new Error("Question bank unavailable")
      const body = fileName.endsWith(".gz") ? await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text() : await file.text()
      return JSON.parse(body) as { questions?: unknown[] }
    }))
    const body = JSON.stringify({ title: subjectId === "bao-mat-ung-dung-he-thong" ? "SEC301" : subjectId === "marketing-can-ban" ? "MAR101 Final" : subjectId === "ky-nang-khoi-nghiep-va-lanh-dao" ? "ENT101 Final" : subjectId === "ky-nang-quan-ly-du-an" ? "PM101 Final" : "SQA101 Final", questions: banks.flatMap((bank, bankIndex) => (bank.questions ?? []).map((question) => ({ ...(question as Record<string, unknown>), id: `${bankIndex}-${String((question as { id?: unknown }).id ?? "")}` }))) })
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(body))
    const etag = `"${Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}"`
    bankCache.set(cacheKey, { body, etag })
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: corsHeaders(req, { ETag: etag, "Cache-Control": "private, max-age=86400" }) })
    return new Response(body, { status: 200, headers: corsHeaders(req, { "Content-Type": "application/json", "Cache-Control": "private, max-age=86400", ETag: etag }) })
  } catch {
    logServerError("paid_question_bank_failed")
    return new Response(JSON.stringify({ error: "Unable to load question bank" }), { status: 500, headers: corsHeaders(req) })
  }
})
