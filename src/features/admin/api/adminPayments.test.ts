import { describe, expect, it } from "vitest"
import { sortAdminPaymentsByCreatedAt, type AdminPayment } from "./adminPayments"

function payment(orderId: string, createdAt: string, paidAt: string | null): AdminPayment {
  return {
    orderId,
    createdAt,
    paidAt,
    userId: "user",
    productId: "product",
    productName: "Product",
    amountVnd: 10_000,
    currency: "VND",
    status: paidAt ? "paid" : "pending",
    transactionId: null,
  }
}

describe("sortAdminPaymentsByCreatedAt", () => {
  it("sorts strictly by order creation time instead of payment time", () => {
    const olderPaidLater = payment("ORDER-A", "2026-09-07T14:26:13Z", "2026-09-07T14:30:24Z")
    const newerPending = payment("ORDER-B", "2026-09-07T14:30:16Z", null)

    expect(sortAdminPaymentsByCreatedAt([olderPaidLater, newerPending]).map((item) => item.orderId))
      .toEqual(["ORDER-B", "ORDER-A"])
  })

  it("uses order ID as a stable tie-breaker and moves invalid timestamps last", () => {
    const sameTimeA = payment("ORDER-A", "2026-09-07T14:30:16Z", null)
    const sameTimeB = payment("ORDER-B", "2026-09-07T14:30:16Z", null)
    const invalid = payment("ORDER-Z", "invalid", null)

    expect(sortAdminPaymentsByCreatedAt([invalid, sameTimeA, sameTimeB]).map((item) => item.orderId))
      .toEqual(["ORDER-B", "ORDER-A", "ORDER-Z"])
  })
})
