import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAllPaidProductIds, getOwnedProductIds } from "./purchases"

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ supabase: { from } }))

function mockChain(data: unknown, error: unknown = null) {
  const inMock = vi.fn().mockResolvedValue({ data, error })
  const secondEq = { in: inMock }
  const firstEq = { eq: vi.fn().mockReturnValue(secondEq) }
  const selectMock = { eq: vi.fn().mockReturnValue(firstEq) }
  from.mockReturnValue({ select: vi.fn().mockReturnValue(selectMock) })
  return { selectMock, firstEq, secondEq, inMock }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getOwnedProductIds", () => {
  it("fetches all owned ids with a single batched request", async () => {
    const { inMock } = mockChain([{ product_id: "dsai101" }, { product_id: "phy101" }])
    const owned = await getOwnedProductIds("user-1", ["dsai101", "phy101", "mar101"])
    expect(from).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith("purchases")
    expect(inMock).toHaveBeenCalledExactlyOnceWith("product_id", ["dsai101", "phy101", "mar101"])
    expect(owned).toEqual(new Set(["dsai101", "phy101"]))
  })

  it("dedupes product ids before querying", async () => {
    const { inMock } = mockChain([])
    await getOwnedProductIds("user-1", ["a", "a", "b"])
    expect(inMock).toHaveBeenCalledExactlyOnceWith("product_id", ["a", "b"])
  })

  it("skips the query when user or ids are empty", async () => {
    await expect(getOwnedProductIds("", ["a"])).resolves.toEqual(new Set())
    await expect(getOwnedProductIds("user-1", [])).resolves.toEqual(new Set())
    expect(from).not.toHaveBeenCalled()
  })

  it("throws when supabase returns an error", async () => {
    mockChain(null, { message: "boom" })
    await expect(getOwnedProductIds("user-1", ["a"])).rejects.toEqual({ message: "boom" })
  })
})

describe("getAllPaidProductIds", () => {
  it("covers every paid product used by the catalog sweep", () => {
    const ids = getAllPaidProductIds()
    expect(ids).toHaveLength(33)
    expect(new Set(ids).size).toBe(33)
    expect(ids).toContain("dsai101")
    expect(ids).toContain("tadv02")
    expect(ids).toContain("sta201")
  })
})
