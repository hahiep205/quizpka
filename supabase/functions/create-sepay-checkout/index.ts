import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { clientIp, corsHeaders, getUserWithTimeout, jsonWithCors, rateGate, readJsonBody, requestBodyLimit, verifyTurnstile } from "../_shared/edge-guard.ts"

// P1: CORS whitelist (was: echo any Origin). Turnstile enforced when
// TURNSTILE_SECRET_KEY is set; pending-order reuse is the idempotency
// mechanism (double-clicks resolve to the same order, no duplicate rows).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") return jsonWithCors(req, { error: "Method not allowed" }, 405)
  try {
    const bodyLimit = requestBodyLimit(req, 16 * 1024)
    if (bodyLimit) return bodyLimit
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const ip = clientIp(req)

    // P1: cheap pre-auth gate — drops floods before expensive auth/DB work.
    const ipGate = await rateGate(admin, req, `checkout:ip:${ip}`, 30, 3600, true)
    if (ipGate) return ipGate

    const auth = req.headers.get("Authorization")
    const accessToken = auth?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!accessToken) throw new Error("Authentication required: missing bearer token")
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!)
    // P1: hard timeout so hung Auth responses can't pile up isolates under flood.
    const user = await getUserWithTimeout(supabase, accessToken, 8000).catch(() => null)
    if (!user) throw new Error("Authentication required: invalid or expired session")
    return await checkout(req, admin, user, ip)
  } catch (error) { return jsonWithCors(req, { error: error instanceof Error ? error.message : "Checkout failed" }, 400) }
})

async function checkout(req: Request, admin: ReturnType<typeof createClient>, user: { id: string }, ip: string) {
  // P1: per-user gate.
  const userGate = await rateGate(admin, req, `checkout:user:${user.id}`, 10, 3600, true)
  if (userGate) return userGate

  const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
  if (profileError) throw new Error("Unable to verify account status")
  if (profile.status !== "active") return jsonWithCors(req, { error: "Account is blocked" }, 403)

  const input = await readJsonBody(req, 16 * 1024) as { productId?: unknown; turnstileToken?: unknown } | null
  const rawProductId = typeof input?.productId === "string" ? input.productId : ""
  // P1: shape-check only; existence/activeness is decided by the DB lookup
  // below (the old 30-item hardcoded allowlist silently rejected new products
  // and is now the single source-of-truth bug — products table owns it).
  if (!/^[a-z0-9]{2,20}$/i.test(rawProductId)) return jsonWithCors(req, { error: "Product unavailable" }, 400)
  const productId = rawProductId
  const { data: product, error: productError } = await admin.from("products").select("id,name,price_vnd,active").eq("id", productId).single()
  if (productError || !product || !product.active) return jsonWithCors(req, { error: "Product unavailable" }, 400)

  // P1: bot gate. Required iff TURNSTILE_SECRET_KEY is configured server-side
  // (frontend sends the token when VITE_TURNSTILE_SITE_KEY is configured).
  const turnstileToken = typeof input?.turnstileToken === "string" ? input.turnstileToken : ""
  const turnstile = await verifyTurnstile(turnstileToken, ip)
  if (!turnstile.ok) return jsonWithCors(req, { error: "Bot check failed, please retry" }, 403)

  const { data: existing, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", product.id).eq("status", "paid").maybeSingle()
  if (purchaseError) throw new Error("Unable to verify purchase")
  if (existing) return jsonWithCors(req, { owned: true }, 200)

  await admin.rpc("expire_pending_orders")
  const { data: pending, error: pendingError } = await admin.from("orders").select("order_id,transfer_content").eq("user_id", user.id).eq("product_id", product.id).eq("status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle()
  if (pendingError) throw new Error("Unable to verify pending order")
  let orderId = pending?.order_id ?? `${productId === "sqa101" ? "SQA" : productId === "sec301" ? "SEC" : productId === "idsai101" ? "IDSAI" : productId === "mar101" ? "MAR" : productId === "mac102" ? "MAC" : productId === "oit101" ? "OIT" : productId === "fin101" ? "FIN" : productId === "civ101" ? "CIV" : productId === "eco101" ? "ECO" : productId === "law101" ? "LAW" : productId === "hcm101" ? "HCM" : productId === "mgt101" ? "MGT" : productId === "phy101" ? "PHY" : productId === "ppt101" || productId === "ppt102" ? "PPT" : productId === "gt101" ? "GT" : productId === "dst101" ? "DST" : productId === "xst101" ? "XST" : productId === "mln102" ? "MLN" : productId === "pec101" ? "PEC" : productId === "mln101" ? "ML1" : productId === "his101" ? "HIS" : productId === "soc101" ? "SOC" : productId === "dm101" ? "DM" : productId === "ta101" ? "TA" : productId === "rm101" ? "RM" : productId === "rm102" ? "RM" : productId === "tadv02" ? "TA2" : productId === "sta201" ? "STA" : productId === "db101" ? "DB" : productId === "ent101" ? "ENT" : productId === "pm101" ? "PM" : "DSAI"}-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
  let transferContent = pending?.transfer_content ?? ""
  if (!pending) {
    transferContent = `PAY${crypto.randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`
    const { error: orderError } = await admin.from("orders").insert({ order_id: orderId, user_id: user.id, product_id: product.id, amount_vnd: product.price_vnd, currency: "VND", transfer_content: transferContent, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() })
    if (orderError) {
      const { data: concurrent } = await admin.from("orders").select("order_id,transfer_content").eq("user_id", user.id).eq("product_id", product.id).eq("status", "pending").maybeSingle()
      if (!concurrent) throw new Error("Unable to create order")
      orderId = concurrent.order_id
      if (concurrent.transfer_content) transferContent = concurrent.transfer_content
    }
  }
  if (!transferContent) {
    transferContent = `PAY${crypto.randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`
    const { error: contentError } = await admin.from("orders").update({ transfer_content: transferContent }).eq("order_id", orderId).is("transfer_content", null)
    if (contentError) throw new Error("Unable to prepare payment content")
  }
  const { SePayPgClient } = await import("npm:sepay-pg-node@1.0.0")
  const environment = Deno.env.get("SEPAY_ENV")
  const merchantId = Deno.env.get("SEPAY_MERCHANT_ID") ?? ""
  const secretKey = Deno.env.get("SEPAY_SECRET_KEY") ?? ""
  const siteUrl = Deno.env.get("SITE_URL") ?? ""
  if (environment !== "sandbox" && environment !== "production") throw new Error("Invalid SePay environment")
  if (!merchantId || !secretKey) throw new Error("Missing SePay credentials")
  if (!URL.canParse(siteUrl) || !siteUrl.startsWith("https://")) throw new Error("Invalid site URL")
  const client = new SePayPgClient({ env: environment, merchant_id: merchantId, secret_key: secretKey })
  const fields = client.checkout.initOneTimePaymentFields({ operation: "PURCHASE", payment_method: "BANK_TRANSFER", order_invoice_number: orderId, order_amount: product.price_vnd, currency: "VND", order_description: `Thanh toan don hang ${orderId}`, success_url: `${Deno.env.get("SITE_URL")}/dashboard/purchased?payment=success`, error_url: `${Deno.env.get("SITE_URL")}/dashboard/purchased?payment=error`, cancel_url: `${Deno.env.get("SITE_URL")}/dashboard/purchased?payment=cancel` })
  // Keep account details server-side. Secrets override the existing merchant account defaults.
  const bankCode = Deno.env.get("SEPAY_BANK_CODE") || "970422"
  const bankName = Deno.env.get("SEPAY_BANK_NAME") || "Ngân hàng TMCP Quân Đội MBBank"
  const accountName = Deno.env.get("SEPAY_ACCOUNT_NAME") || "Hà Văn Hiệp"
  const accountNumber = Deno.env.get("SEPAY_ACCOUNT_NUMBER") || "0001230986723"
  const qrUrl = `https://vietqr.app/img?acc=${encodeURIComponent(accountNumber)}&bank=${encodeURIComponent(bankCode)}&amount=${product.price_vnd}&des=${encodeURIComponent(transferContent)}&template=qronly`
  return jsonWithCors(req, { owned: false, orderId, checkoutUrl: client.checkout.initCheckoutUrl(), fields, payment: { qrUrl } }, 200)
}
