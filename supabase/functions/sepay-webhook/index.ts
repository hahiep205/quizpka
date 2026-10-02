import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { clientIp, logServerError, rateGate, requestBodyLimit, secretsEqual } from "../_shared/edge-guard.ts"

// P1: server-to-server webhook — no CORS headers at all (browsers never call
// this). Constant-time secret compare, generic order-id shape check (the old
// prefix allowlist silently dropped legit prefixes like TA2/STA/DB/PHY),
// timestamp freshness anti-replay, per-IP rate gate, upsert dedup on the
// partial unique indexes (provider,event_id) / (provider,transaction_id).

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : ""
}

function amount(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Order ids are "<PREFIX>-<20 upper-alnum>" (see create-sepay-checkout).
// Shape check only — existence is decided by the DB lookup.
function looksLikeOrderId(value: string) {
  return /^[A-Z0-9]{2,6}-[A-Z0-9]{10,32}$/.test(value)
}

function payloadTimestampMs(payload: Record<string, unknown>): number | null {
  const raw = payload.timestamp ?? (payload.transaction as Record<string, unknown> | undefined)?.timestamp
  if (typeof raw === "number" && Number.isFinite(raw)) return raw > 1e12 ? raw : raw * 1000
  if (typeof raw === "string" && raw) {
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok")
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

  const receivedSecret = req.headers.get("x-secret-key") ?? req.headers.get("authorization")?.replace(/^Apikey\s+/i, "")
  const expectedSecret = Deno.env.get("SEPAY_SECRET_KEY") ?? ""
  if (!receivedSecret || !expectedSecret || !secretsEqual(receivedSecret, expectedSecret)) {
    return new Response("Invalid secret", { status: 401 })
  }

  try {
    const bodyLimit = requestBodyLimit(req, 128 * 1024)
    if (bodyLimit) return new Response("Request too large", { status: 413 })
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    // P1: flood gate for forged-but correctly-signed replays / retry storms.
    const ipGate = await rateGate(admin, req, `webhook:ip:${clientIp(req)}`, 600, 3600, true)
    if (ipGate) return ipGate

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
    // Silent ignore (no logs — probes would turn logs into a billing vector).
    if ((!looksLikeOrderId(suppliedOrderId)) && !transferContent) {
      return Response.json({ success: true, ignored: true })
    }
    if (!isBankIn && !isPaidCheckout) return Response.json({ success: true })

    // P1: anti-replay — SePay retries are minutes apart; a day-old payload is a replay.
    const ts = payloadTimestampMs(payload)
    if (ts !== null && Math.abs(Date.now() - ts) > 24 * 60 * 60 * 1000) {
      return Response.json({ success: true, ignored: true })
    }

    let orderQuery = admin.from("orders").select("order_id,user_id,product_id,amount_vnd,currency,status,provider_transaction_id,provider_event_id,transfer_content")
    if (transferContent) orderQuery = orderQuery.eq("transfer_content", transferContent)
    else orderQuery = orderQuery.eq("order_id", suppliedOrderId)
    const { data: order, error: orderError } = await orderQuery.maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      return Response.json({ success: true, ignored: true })
    }
    const orderId = order.order_id

    const receivedAmount = amount(transaction?.transaction_amount ?? payloadOrder?.order_amount ?? payload.transferAmount)
    if (receivedAmount === null || receivedAmount !== Number(order.amount_vnd)) return new Response("Amount mismatch", { status: 422 })
    const receivedCurrency = text(transaction?.transaction_currency ?? payloadOrder?.order_currency ?? payload.currency).toUpperCase()
    if (receivedCurrency && receivedCurrency !== order.currency) return new Response("Currency mismatch", { status: 422 })
    if (order.status === "canceled" || order.status === "refunded" || order.status === "failed") return Response.json({ success: true, ignored: true }, { status: 200 })

    const transactionId = text(transaction?.transaction_id ?? transaction?.id ?? payload.referenceCode) || null
    const eventId = text(transaction?.id ?? payload.id ?? payload.timestamp) || null
    // P1: dedup via upsert on the partial unique index instead of
    // insert + fragile "duplicate" message matching.
    const row = {
      provider: "sepay",
      event_id: eventId,
      transaction_id: transactionId,
      order_id: orderId,
      payload,
      status: "received",
    }
    let paymentEventId: string | null = null
    if (eventId) {
      const { data, error } = await admin.from("payment_events")
        .upsert(row, { onConflict: "provider,event_id", ignoreDuplicates: true })
        .select("id").maybeSingle()
      if (error) throw error
      paymentEventId = data?.id ?? null
      if (!paymentEventId) return Response.json({ ok: true, duplicate: true })
    } else {
      const { data, error } = await admin.from("payment_events").insert(row).select("id").maybeSingle()
      if (error) {
        if (error.message.toLowerCase().includes("duplicate")) return Response.json({ ok: true, duplicate: true })
        throw error
      }
      paymentEventId = data?.id ?? null
    }
    const { data: result, error: completionError } = await admin.rpc("complete_paid_order", {
      p_order_id: orderId,
      p_transaction_id: transactionId,
      p_event_id: eventId,
      p_payload: payload,
    })
    if (completionError) throw completionError
    if (paymentEventId) {
      const { error: eventUpdateError } = await admin.from("payment_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", paymentEventId)
      if (eventUpdateError) throw eventUpdateError
    }
    return Response.json({ success: true, ...result })
  } catch {
    logServerError("sepay_webhook_processing_failed")
    return new Response("Webhook processing failed", { status: 500 })
  }
})
