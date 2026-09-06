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
  products: { name: string } | Array<{ name: string }> | null
}

function parseOrder(row: OrderRow): AdminPayment {
  const product = Array.isArray(row.products) ? row.products[0] : row.products
  return {
    orderId: row.order_id,
    userId: row.user_id,
    productId: row.product_id,
    productName: product?.name ?? row.product_id,
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
  let offset = 0
  try {
    while (true) {
      const { data, error } = await supabase
        .from("orders")
        .select("order_id,user_id,product_id,amount_vnd,currency,status,provider_transaction_id,paid_at,created_at,products(name)")
        .order("created_at", { ascending: false })
        .range(offset, offset + 999)
      if (error) return { ok: false, payments: [], error: `Không đọc được giao dịch: ${error.message}` }
      const rows = (data as unknown as OrderRow[]).map(parseOrder)
      payments.push(...rows)
      if (rows.length < 1000) return { ok: true, payments }
      offset += rows.length
    }
  } catch (err) {
    return { ok: false, payments: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}
