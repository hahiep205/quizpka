import { describe, expect, it } from "vitest"
import { appRoutes, isAppPath } from "@/app/navigation"

describe("app navigation", () => {
  it("recognizes only declared application routes", () => {
    expect(isAppPath(appRoutes.home)).toBe(true)
    expect(isAppPath(appRoutes.dashboard)).toBe(true)
    expect(isAppPath("/missing")).toBe(false)
  })
})
