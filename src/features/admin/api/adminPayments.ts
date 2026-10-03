import { supabase } from "@/lib/supabase"

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "canceled"

export type AdminPayment = {
  orderId: string
  userId: string
  productId: string
  productName: string
  userDisplayName: string | null
  userEmail: string | null
  amountVnd: number
  currency: string
  status: PaymentStatus
  transactionId: string | null
  paidAt: string | null
  createdAt: string
}

export type AdminPaymentsResult =
  | { ok: true; payments: AdminPayment[] }
  | { ok: false; error: string; payments: AdminPayment[] }

type OrderRow = {
  order_id: string
  user_id: string
  product_id: string
  product_name: string | null
  user_display_name: string | null
  user_email: string | null
  amount_vnd: number
  currency: string
  status: PaymentStatus
  provider_transaction_id: string | null
  paid_at: string | null
  created_at: string
}

export function sortAdminPaymentsByCreatedAt(payments: AdminPayment[]): AdminPayment[] {
  return [...payments].sort((a, b) => {
    const aCreatedAt = Date.parse(a.createdAt)
    const bCreatedAt = Date.parse(b.createdAt)
    if (Number.isNaN(aCreatedAt)) return Number.isNaN(bCreatedAt) ? b.orderId.localeCompare(a.orderId) : 1
    if (Number.isNaN(bCreatedAt)) return -1
    return bCreatedAt - aCreatedAt || b.orderId.localeCompare(a.orderId)
  })
}

function parseOrder(row: OrderRow): AdminPayment {
  return {
    orderId: row.order_id,
    userId: row.user_id,
    productId: row.product_id,
    productName: row.product_name ?? row.product_id,
    userDisplayName: row.user_display_name ?? null,
    userEmail: row.user_email ?? null,
    amountVnd: Number(row.amount_vnd) || 0,
    currency: row.currency,
    status: row.status,
    transactionId: row.provider_transaction_id,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }
}

/**
 * P-log-cost: bảng giao dịch chỉ hiển thị đơn trong ngày (client đã lọc
 * isToday) nhưng trước đây dump TOÀN BỘ orders theo trang 1000. Giờ 1 request
 * với mốc since (0h hôm nay theo giờ local) qua public.admin_list_orders;
 * tên sản phẩm + tên user được join sẵn trên server.
 */
export async function fetchAdminOrders(since: string, limit = 500): Promise<AdminPaymentsResult> {
  try {
    const { data, error } = await supabase.rpc("admin_list_orders", { p_since: since, p_limit: limit })
    if (error) return { ok: false, payments: [], error: `Không đọc được giao dịch: ${error.message}` }
    const result = (data ?? {}) as { items?: OrderRow[] }
    return { ok: true, payments: (result.items ?? []).map(parseOrder) }
  } catch (err) {
    return { ok: false, payments: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/** Mốc 0h hôm nay theo giờ máy admin — cùng định nghĩa isToday() phía client. */
export function todayMidnightISO(): string {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  return midnight.toISOString()
}
