import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Vary": "Origin",
})

// Paid image-document sets. Storage paths are never taken from client input:
// only these whitelisted document ids can be resolved.
const subjectProducts: Record<string, string> = {
  "vat-ly-1": "phy101",
  "phuong-phap-tinh-giua-ky": "ppt101",
  "phuong-phap-tinh-cuoi-ky": "ppt102",
  "giai-tich": "gt101",
  "dai-so-tuyen-tinh": "dst101",
  "xac-suat-thong-ke": "xst101",
  "toan-roi-rac": "dm101",
  "tieng-anh-1": "ta101",
}

const documentFiles: Record<string, string[]> = {
  "phy-de-1": ["phy101/vatly1-de1-img1.jpg", "phy101/vatly1-de1-img2.jpg"],
  "phy-de-2": ["phy101/vatly1-de2-img1.jpg", "phy101/vatly1-de2-img2.jpg"],
  "phy-de-3": ["phy101/vatly1-de3-img1.jpg", "phy101/vatly1-de3-img2.jpg"],
  "ppt-mid-de-1": ["ppt101/ppt-giuaky.png"],
  "ppt-final-de-1": ["ppt102/ppt-01.png"],
  "ppt-final-de-2": ["ppt102/ppt-02.png"],
  "cal-de-1": ["gt101/giai-tich-de1.png"],
  "cal-de-2": ["gt101/giai-tich-de2.png"],
  "dst-de-1": ["dst101/de1.png"],
  "xstk-de-1": ["xst101/de1.png"],
  "dm-de-1": ["dm101/de1-img1.png", "dm101/de1-img2.png", "dm101/de1-img3.png"],
  "dm-de-2": ["dm101/de-tu-luan-2-img1.png", "dm101/de-tu-luan-2-img2.png"],
  "dm-de-3": ["dm101/de-tu-luan-3-img1.png", "dm101/de-tu-luan-3-img2.png"],
  "ta1-cau-truc-de": ["ta101/cau-truc-de.png"],
}

// Each document belongs to exactly one product. The requested document must
// belong to the requested subject's product, otherwise a buyer of one subject
// could read another subject's documents.
const documentProducts: Record<string, string> = {
  "phy-de-1": "phy101",
  "phy-de-2": "phy101",
  "phy-de-3": "phy101",
  "ppt-mid-de-1": "ppt101",
  "ppt-final-de-1": "ppt102",
  "ppt-final-de-2": "ppt102",
  "cal-de-1": "gt101",
  "cal-de-2": "gt101",
  "dst-de-1": "dst101",
  "xstk-de-1": "xst101",
  "dm-de-1": "dm101",
  "dm-de-2": "dm101",
  "dm-de-3": "dm101",
  "ta1-cau-truc-de": "ta101",
}

function json(body: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req)
  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401, req)
    const input = await req.json().catch(() => null) as { subjectId?: unknown; documentId?: unknown } | null
    const subjectId = typeof input?.subjectId === "string" ? input.subjectId : ""
    const documentId = typeof input?.documentId === "string" ? input.documentId : ""
    const productId = subjectProducts[subjectId]
    const objectPaths = documentFiles[documentId]
    if (!productId || !objectPaths || documentProducts[documentId] !== productId) {
      return json({ error: "Unknown document" }, 400, req)
    }
    const projectUrl = Deno.env.get("SUPABASE_URL")!
    const userClient = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: "Authentication required" }, 401, req)
    const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError || profile.status !== "active") return json({ error: "Account is not active" }, 403, req)
    const { data: purchase, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", productId).eq("status", "paid").maybeSingle()
    if (purchaseError) throw purchaseError
    if (!purchase) return json({ error: "Purchase required" }, 403, req)
    const { data: signed, error: signError } = await admin.storage.from("paid-question-banks").createSignedUrls(objectPaths, 3600)
    if (signError || !signed) return json({ error: "Document unavailable" }, 503, req)
    const images = signed.map((item, index) => {
      if (item.error || !item.signedUrl) throw new Error("Document unavailable")
      return { url: item.signedUrl, name: objectPaths[index].split("/").pop() ?? `image-${index + 1}.jpg` }
    })
    return json({ images }, 200, req)
  } catch (error) {
    console.error("Get paid document failed", error)
    return json({ error: "Unable to load document" }, 500, req)
  }
})
