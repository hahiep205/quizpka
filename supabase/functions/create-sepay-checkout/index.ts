import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SePayPgClient } from "npm:sepay-pg-node"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const auth = req.headers.get("Authorization")
    if (!auth) throw new Error("Authentication required")
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Authentication required")
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: existing } = await admin.from("purchases").select("id").eq("user_id", user.id).eq("product_id", "dsai101").eq("status", "paid").maybeSingle()
    if (existing) return Response.json({ owned: true }, { headers: cors })
    const orderId = `DSAI-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
    await admin.from("orders").insert({ order_id: orderId, user_id: user.id, product_id: "dsai101", amount_vnd: 10000 })
    const client = new SePayPgClient({ env: Deno.env.get("SEPAY_ENV") as "sandbox" | "production", merchant_id: Deno.env.get("SEPAY_MERCHANT_ID")!, secret_key: Deno.env.get("SEPAY_SECRET_KEY")! })
    const fields = client.checkout.initOneTimePaymentFields({ payment_method: "BANK_TRANSFER", order_invoice_number: orderId, order_amount: 10000, currency: "VND", order_description: `Thanh toan don hang ${orderId}`, success_url: `${Deno.env.get("SITE_URL")}/dashboard/purchased?payment=success`, error_url: `${Deno.env.get("SITE_URL")}/dashboard/purchased?payment=error`, cancel_url: `${Deno.env.get("SITE_URL")}/dashboard/purchased?payment=cancel` })
    return Response.json({ owned: false, orderId, checkoutUrl: client.checkout.initCheckoutUrl(), fields }, { headers: cors })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 400, headers: cors }) }
})
