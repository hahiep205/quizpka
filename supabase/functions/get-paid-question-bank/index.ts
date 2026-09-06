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
}
const subjectProducts: Record<string, string> = {
  "khoa-hoc-du-lieu-va-tri-tue-nhan-tao": "dsai101",
  "danh-gia-va-kiem-dinh-chat-luong-phan-mem": "sqa101",
  "bao-mat-ung-dung-he-thong": "sec301",
}
const sqaFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json"]
const secFiles = ["chuong_1.json", "chuong_2.json", "chuong_3.json", "chuong_4.json", "chuong_5.json", "chuong_6.json.gz", "chuong_7.json", "chuong_8.json"]

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors(req) })
  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: cors(req) })
    const input = await req.json().catch(() => null) as { examId?: unknown; subjectId?: unknown } | null
    const examId = typeof input?.examId === "string" ? input.examId : ""
    const subjectId = typeof input?.subjectId === "string" ? input.subjectId : ""
    const productId = subjectProducts[subjectId] ?? "dsai101"
    const objectPath = examFiles[examId]
    if (!objectPath && subjectId !== "danh-gia-va-kiem-dinh-chat-luong-phan-mem" && subjectId !== "bao-mat-ung-dung-he-thong") return new Response(JSON.stringify({ error: "Unknown exam" }), { status: 400, headers: cors(req) })
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
    const files = subjectId === "bao-mat-ung-dung-he-thong" ? secFiles : sqaFiles
    const directory = subjectId === "bao-mat-ung-dung-he-thong" ? "sec301" : "sqa101"
    const banks = await Promise.all(files.map(async (fileName) => {
      const { data: file, error } = await admin.storage.from("paid-question-banks").download(`${directory}/${fileName}`)
      if (error || !file) throw new Error("Question bank unavailable")
      const body = fileName.endsWith(".gz") ? await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text() : await file.text()
      return JSON.parse(body) as { questions?: unknown[] }
    }))
    return new Response(JSON.stringify({ title: subjectId === "bao-mat-ung-dung-he-thong" ? "SEC301" : "SQA101 Final", questions: banks.flatMap((bank, bankIndex) => (bank.questions ?? []).map((question) => ({ ...(question as Record<string, unknown>), id: `${bankIndex}-${String((question as { id?: unknown }).id ?? "")}` }))) }), { status: 200, headers: cors(req) })
  } catch (error) {
    console.error("Get paid question bank failed", error)
    return new Response(JSON.stringify({ error: "Unable to load question bank" }), { status: 500, headers: cors(req) })
  }
})
