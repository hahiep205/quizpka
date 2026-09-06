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

  const receivedSecret = req.headers.get("x-secret-key") ?? req.headers.get("authorization")?.replace(/^Apikey\s+/i, "")
  const expectedSecret = Deno.env.get("SEPAY_SECRET_KEY") ?? ""
  if (!receivedSecret || !expectedSecret || receivedSecret !== expectedSecret) return new Response("Invalid secret", { status: 401 })

  try {
    const payload = await req.json() as Record<string, unknown>
    const payloadOrder = payload.order as Record<string, unknown> | undefined
    const transaction = payload.transaction as Record<string, unknown> | undefined
    const suppliedOrderId = text(payloadOrder?.order_invoice_number ?? payload.order_invoice_number)
    const transactionContent = text(transaction?.transaction_content ?? transaction?.transaction_description ?? transaction?.description ?? payload.content ?? payload.transaction_content ?? payload.description ?? payload.code)
    const transferContent = transactionContent.match(/PAY[A-Z0-9]+/i)?.[0]?.toUpperCase() ?? ""
    const status = text(payloadOrder?.order_status ?? transaction?.transaction_status).toUpperCase()
    const transferType = text(payload.transferType).toLowerCase()
    const isBankIn = transferType === "in"
    const isPaidCheckout = payload.notification_type === "ORDER_PAID" && ["CAPTURED", "APPROVED", "PAID"].includes(status)
    // SePay's "Send test" payload may not contain an order created by QuizPKA.
    // Acknowledge unrelated transactions so SePay does not retry them forever.
    if ((!suppliedOrderId || !/^(DSAI|SQA|SEC)-[A-Z0-9]+$/.test(suppliedOrderId)) && !transferContent) {
      console.info("Ignored webhook without QuizPKA payment code")
      return Response.json({ success: true, ignored: true }, { headers: cors })
    }
    if (!isBankIn && !isPaidCheckout) return Response.json({ success: true }, { headers: cors })

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    let orderQuery = admin.from("orders").select("order_id,user_id,product_id,amount_vnd,currency,status,provider_transaction_id,provider_event_id,transfer_content")
    if (transferContent) orderQuery = orderQuery.eq("transfer_content", transferContent)
    else orderQuery = orderQuery.eq("order_id", suppliedOrderId)
    const { data: order, error: orderError } = await orderQuery.maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      console.info("Ignored webhook for unknown QuizPKA payment code", transferContent || suppliedOrderId)
      return Response.json({ success: true, ignored: true }, { headers: cors })
    }
    const orderId = order.order_id

    const receivedAmount = amount(transaction?.transaction_amount ?? payloadOrder?.order_amount ?? payload.transferAmount)
    if (receivedAmount === null || receivedAmount !== Number(order.amount_vnd)) return new Response("Amount mismatch", { status: 422 })
    const receivedCurrency = text(transaction?.transaction_currency ?? payloadOrder?.order_currency ?? payload.currency).toUpperCase()
    if (receivedCurrency && receivedCurrency !== order.currency) return new Response("Currency mismatch", { status: 422 })
    if (order.status === "canceled" || order.status === "refunded" || order.status === "failed") return new Response("Order state conflict", { status: 409 })

    const transactionId = text(transaction?.transaction_id ?? transaction?.id ?? payload.referenceCode) || null
    const eventId = text(transaction?.id ?? payload.id ?? payload.timestamp) || null
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
