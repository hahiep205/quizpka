import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = (req: Request) => ({ "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" })
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors(req) })
  try {
    const auth = req.headers.get("Authorization")
    const accessToken = auth?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!accessToken) throw new Error("Authentication required: missing bearer token")
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!)
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError) console.error("create-sepay-checkout auth verification failed", authError.message)
    if (!user) throw new Error("Authentication required: invalid or expired session")
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) throw new Error("Unable to verify account status")
    if (profile.status !== "active") return Response.json({ error: "Account is blocked" }, { status: 403, headers: cors(req) })
    const input = await req.json().catch(() => null) as { productId?: unknown } | null
    const productId = input?.productId === "sqa101" ? "sqa101" : input?.productId === "sec301" ? "sec301" : "dsai101"
    const { data: product, error: productError } = await admin.from("products").select("id,name,price_vnd,active").eq("id", productId).single()
    if (productError || !product || !product.active) return Response.json({ error: "Product unavailable" }, { status: 503, headers: cors(req) })
    const { data: existing, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", product.id).eq("status", "paid").maybeSingle()
    if (purchaseError) throw new Error("Unable to verify purchase")
    if (existing) return Response.json({ owned: true }, { headers: cors(req) })
    const { data: pending, error: pendingError } = await admin.from("orders").select("order_id,transfer_content").eq("user_id", user.id).eq("product_id", product.id).eq("status", "pending").maybeSingle()
    if (pendingError) throw new Error("Unable to verify pending order")
    let orderId = pending?.order_id ?? `${productId === "sqa101" ? "SQA" : productId === "sec301" ? "SEC" : "DSAI"}-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
    let transferContent = pending?.transfer_content ?? ""
    if (!pending) {
      transferContent = `PAY${crypto.randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`
      const { error: orderError } = await admin.from("orders").insert({ order_id: orderId, user_id: user.id, product_id: product.id, amount_vnd: product.price_vnd, currency: "VND", transfer_content: transferContent })
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
    console.info("SePay checkout diagnostic", {
      environment,
      checkoutUrl: client.checkout.initCheckoutUrl(),
      merchantPrefix: merchantId.slice(0, 4),
      merchantLength: merchantId.length,
      secretLength: secretKey.length,
      siteOrigin: new URL(siteUrl).origin,
      fieldNames: Object.keys(fields),
    })
    // Keep account details server-side. Secrets override the existing merchant account defaults.
    const bankCode = Deno.env.get("SEPAY_BANK_CODE") || "970422"
    const bankName = Deno.env.get("SEPAY_BANK_NAME") || "Ngân hàng TMCP Quân Đội MBBank"
    const accountName = Deno.env.get("SEPAY_ACCOUNT_NAME") || "Hà Văn Hiệp"
    const accountNumber = Deno.env.get("SEPAY_ACCOUNT_NUMBER") || "0001230986723"
    const qrUrl = `https://vietqr.app/img?acc=${encodeURIComponent(accountNumber)}&bank=${encodeURIComponent(bankCode)}&amount=${product.price_vnd}&des=${encodeURIComponent(transferContent)}&template=qronly`
    return Response.json({ owned: false, orderId, checkoutUrl: client.checkout.initCheckoutUrl(), fields, payment: { qrUrl } }, { headers: cors(req) })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 400, headers: cors(req) }) }
})
