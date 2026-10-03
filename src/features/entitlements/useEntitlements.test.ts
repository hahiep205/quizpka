import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearEntitlementsCache,
  invalidateEntitlements,
  loadEntitlements,
  markEntitlementOwned,
  resetEntitlementsForTests,
} from "./useEntitlements"
import { getOwnedProductIds } from "@/lib/purchases"

vi.mock("@/lib/purchases", () => ({ getOwnedProductIds: vi.fn() }))

const mocked = vi.mocked(getOwnedProductIds)

beforeEach(() => {
  resetEntitlementsForTests()
  vi.clearAllMocks()
  mocked.mockResolvedValue(new Set(["dsai101"]))
})

describe("entitlements cache", () => {
  it("shares one fetch between concurrent mounts", async () => {
    const [a, b] = await Promise.all([
      loadEntitlements("user-1", ["dsai101", "phy101"]),
      loadEntitlements("user-1", ["dsai101", "phy101"]),
    ])
    expect(mocked).toHaveBeenCalledTimes(1)
    expect(a).toEqual(new Set(["dsai101"]))
    expect(b).toEqual(new Set(["dsai101"]))
  })

  it("serves the second read from cache without refetching", async () => {
    await loadEntitlements("user-1", ["dsai101"])
    await loadEntitlements("user-1", ["dsai101"])
    expect(mocked).toHaveBeenCalledTimes(1)
  })

  it("refetches after invalidate and keeps users isolated", async () => {
    await loadEntitlements("user-1", ["dsai101"])
    invalidateEntitlements("user-1")
    await loadEntitlements("user-1", ["dsai101"])
    expect(mocked).toHaveBeenCalledTimes(2)
    await loadEntitlements("user-2", ["dsai101"])
    expect(mocked).toHaveBeenCalledTimes(3)
  })

  it("marks ownership optimistically and clears on logout", async () => {
    await loadEntitlements("user-1", ["dsai101"])
    markEntitlementOwned("user-1", "phy101")
    const cached = await loadEntitlements("user-1", ["dsai101", "phy101"])
    expect(cached.has("phy101")).toBe(true)
    expect(mocked).toHaveBeenCalledTimes(1)
    clearEntitlementsCache("user-1")
    await loadEntitlements("user-1", ["dsai101"])
    expect(mocked).toHaveBeenCalledTimes(2)
  })
})
