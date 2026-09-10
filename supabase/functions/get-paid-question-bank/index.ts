import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Vary": "Origin",
})

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
}
const sqaFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json"]
const secFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json.gz", "chuong_7.json", "chuong_8.json"]
const marFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json", "chuong_7.json", "chuong_8.json", "chuong_9.json"]

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors(req) })
  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: cors(req) })
    const input = await req.json().catch(() => null) as { examId?: unknown; subjectId?: unknown } | null
    const examId = typeof input?.examId === "string" ? input.examId : ""
    const subjectId = typeof input?.subjectId === "string" ? input.subjectId : ""
    const productId = subjectProducts[subjectId]
    if (!productId) return new Response(JSON.stringify({ error: "Unknown subject" }), { status: 400, headers: cors(req) })
    const objectPath = examFiles[examId]
    if (!objectPath && subjectId !== "danh-gia-va-kiem-dinh-chat-luong-phan-mem" && subjectId !== "bao-mat-ung-dung-he-thong" && subjectId !== "marketing-can-ban") return new Response(JSON.stringify({ error: "Unknown exam" }), { status: 400, headers: cors(req) })
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: cors(req) })
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError || profile.status !== "active") return new Response(JSON.stringify({ error: "Account is not active" }), { status: 403, headers: cors(req) })
    const { data: purchase, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", productId).eq("status", "paid").maybeSingle()
    if (purchaseError) throw purchaseError
    if (!purchase) return new Response(JSON.stringify({ error: "Purchase required" }), { status: 403, headers: cors(req) })
    if (objectPath) {
      const { data: file, error: downloadError } = await admin.storage.from("paid-question-banks").download(objectPath)
      if (downloadError || !file) return new Response(JSON.stringify({ error: "Question bank unavailable" }), { status: 503, headers: cors(req) })
      return new Response(await file.text(), { status: 200, headers: cors(req) })
    }
    const files = subjectId === "bao-mat-ung-dung-he-thong" ? secFiles : subjectId === "marketing-can-ban" ? marFiles : sqaFiles
    const directory = subjectId === "bao-mat-ung-dung-he-thong" ? "sec301" : subjectId === "marketing-can-ban" ? "mar101" : "sqa101"
    const banks = await Promise.all(files.map(async (fileName) => {
      const { data: file, error } = await admin.storage.from("paid-question-banks").download(`${directory}/${fileName}`)
      if (error || !file) throw new Error("Question bank unavailable")
      const body = fileName.endsWith(".gz") ? await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text() : await file.text()
      return JSON.parse(body) as { questions?: unknown[] }
    }))
    return new Response(JSON.stringify({ title: subjectId === "bao-mat-ung-dung-he-thong" ? "SEC301" : subjectId === "marketing-can-ban" ? "MAR101 Final" : "SQA101 Final", questions: banks.flatMap((bank, bankIndex) => (bank.questions ?? []).map((question) => ({ ...(question as Record<string, unknown>), id: `${bankIndex}-${String((question as { id?: unknown }).id ?? "")}` }))) }), { status: 200, headers: cors(req) })
  } catch (error) {
    console.error("Get paid question bank failed", error)
    return new Response(JSON.stringify({ error: "Unable to load question bank" }), { status: 500, headers: cors(req) })
  }
})
