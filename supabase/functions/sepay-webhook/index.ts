import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-secret-key", "Access-Control-Allow-Methods": "POST, OPTIONS" }

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : ""
}

function amount(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

  const receivedSecret = req.headers.get("x-secret-key")
  const expectedSecret = Deno.env.get("SEPAY_SECRET_KEY") ?? ""
  if (!receivedSecret || !expectedSecret || receivedSecret !== expectedSecret) return new Response("Invalid secret", { status: 401 })

  try {
    const payload = await req.json() as Record<string, unknown>
    const payloadOrder = payload.order as Record<string, unknown> | undefined
    const transaction = payload.transaction as Record<string, unknown> | undefined
    const orderId = text(payloadOrder?.order_invoice_number)
    const status = text(payloadOrder?.order_status ?? transaction?.transaction_status).toUpperCase()
    if (!orderId || !/^DSAI-[A-Z0-9]+$/.test(orderId)) return new Response("Invalid order", { status: 400 })
    if (payload.notification_type !== "ORDER_PAID" || !["CAPTURED", "APPROVED", "PAID"].includes(status)) return Response.json({ success: true }, { headers: cors })

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("order_id,user_id,product_id,amount_vnd,currency,status,provider_transaction_id,provider_event_id")
      .eq("order_id", orderId)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) return new Response("Order not found", { status: 404 })

    const receivedAmount = amount(transaction?.transaction_amount ?? payloadOrder?.order_amount)
    if (receivedAmount === null || receivedAmount !== Number(order.amount_vnd)) return new Response("Amount mismatch", { status: 422 })
    const receivedCurrency = text(transaction?.transaction_currency ?? payloadOrder?.order_currency).toUpperCase()
    if (receivedCurrency && receivedCurrency !== order.currency) return new Response("Currency mismatch", { status: 422 })
    if (order.status === "canceled" || order.status === "refunded" || order.status === "failed") return new Response("Order state conflict", { status: 409 })

    const transactionId = text(transaction?.transaction_id ?? transaction?.id) || null
    const eventId = text(transaction?.id ?? payload.timestamp) || null
    const { data: paymentEvent, error: eventError } = await admin.from("payment_events").insert({
      provider: "sepay",
      event_id: eventId,
      transaction_id: transactionId,
      order_id: orderId,
      payload,
      status: "received",
    }).select("id").maybeSingle()
    if (eventError && !eventError.message.toLowerCase().includes("duplicate")) throw eventError
    if (!paymentEvent && (eventId || transactionId)) return Response.json({ ok: true, duplicate: true }, { headers: cors })
    const { data: result, error: completionError } = await admin.rpc("complete_paid_order", {
      p_order_id: orderId,
      p_transaction_id: transactionId,
      p_event_id: eventId,
      p_payload: payload,
    })
    if (completionError) throw completionError
    if (paymentEvent) {
      const { error: eventUpdateError } = await admin.from("payment_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", paymentEvent.id)
      if (eventUpdateError) throw eventUpdateError
    }
    return Response.json({ success: true, ...result }, { headers: cors })
  } catch (error) {
    console.error("SePay webhook processing failed", error)
    return new Response("Webhook processing failed", { status: 500 })
  }
})
