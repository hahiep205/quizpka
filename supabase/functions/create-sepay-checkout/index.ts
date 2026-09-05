import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = (req: Request) => ({ "Access-Control-Allow-Origin": req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" })
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors(req) })
  try {
    const auth = req.headers.get("Authorization")
    if (!auth) throw new Error("Authentication required")
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Authentication required")
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: profile, error: profileError } = await admin.from("profiles").select("status").eq("id", user.id).single()
    if (profileError) throw new Error("Unable to verify account status")
    if (profile.status !== "active") return Response.json({ error: "Account is blocked" }, { status: 403, headers: cors(req) })
    const { data: product, error: productError } = await admin.from("products").select("id,name,price_vnd,active").eq("id", "dsai101").single()
    if (productError || !product || !product.active) return Response.json({ error: "Product unavailable" }, { status: 503, headers: cors(req) })
    const { data: existing, error: purchaseError } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", product.id).eq("status", "paid").maybeSingle()
    if (purchaseError) throw new Error("Unable to verify purchase")
    if (existing) return Response.json({ owned: true }, { headers: cors(req) })
    const { data: pending, error: pendingError } = await admin.from("orders").select("order_id").eq("user_id", user.id).eq("product_id", product.id).eq("status", "pending").maybeSingle()
    if (pendingError) throw new Error("Unable to verify pending order")
    let orderId = pending?.order_id ?? `DSAI-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
    if (!pending) {
      const { error: orderError } = await admin.from("orders").insert({ order_id: orderId, user_id: user.id, product_id: product.id, amount_vnd: product.price_vnd, currency: "VND" })
      if (orderError) {
        const { data: concurrent } = await admin.from("orders").select("order_id").eq("user_id", user.id).eq("product_id", product.id).eq("status", "pending").maybeSingle()
        if (!concurrent) throw new Error("Unable to create order")
        orderId = concurrent.order_id
      }
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
    return Response.json({ owned: false, orderId, checkoutUrl: client.checkout.initCheckoutUrl(), fields }, { headers: cors(req) })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 400, headers: cors(req) }) }
})
