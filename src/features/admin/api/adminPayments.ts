import { supabase } from "@/lib/supabase"

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "canceled"

export type AdminPayment = {
  orderId: string
  userId: string
  productId: string
  productName: string
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

function parseOrder(row: OrderRow, productNames: Map<string, string>): AdminPayment {
  return {
    orderId: row.order_id,
    userId: row.user_id,
    productId: row.product_id,
    productName: productNames.get(row.product_id) ?? row.product_id,
    amountVnd: Number(row.amount_vnd) || 0,
    currency: row.currency,
    status: row.status,
    transactionId: row.provider_transaction_id,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }
}

export async function fetchAllAdminPayments(): Promise<AdminPaymentsResult> {
  const payments: AdminPayment[] = []
  try {
    // Lấy tên sản phẩm bằng query riêng thay vì embed `products(name)`.
    // Embed phụ thuộc FK orders.product_id -> products.id trong schema cache
    // của PostgREST nên vỡ với lỗi "Could not find a relationship...".
    const productNames = new Map<string, string>()
    const { data: productRows } = await supabase.from("products").select("id,name")
    for (const row of (productRows as unknown as Array<{ id: string; name: string }> | null) ?? []) {
      if (row?.id) productNames.set(row.id, row.name ?? row.id)
    }
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from("orders")
        .select("order_id,user_id,product_id,amount_vnd,currency,status,provider_transaction_id,paid_at,created_at")
        .order("created_at", { ascending: false })
        .order("order_id", { ascending: false })
        .range(offset, offset + 999)
      if (error) return { ok: false, payments: [], error: `Không đọc được giao dịch: ${error.message}` }
      const rows = (data as unknown as OrderRow[] | null) ?? []
      payments.push(...rows.map((row) => parseOrder(row, productNames)))
      if (rows.length < 1000) return { ok: true, payments }
      offset += rows.length
    }
  } catch (err) {
    return { ok: false, payments: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}
