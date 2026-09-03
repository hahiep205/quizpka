import { describe, expect, it, beforeEach } from "vitest"
import { readStorage, writeStorage } from "./storage"

describe("storage helpers", () => {
  beforeEach(() => window.localStorage.clear())

  it("reads and writes values through localStorage", () => {
    expect(readStorage("missing")).toBeNull()
    writeStorage("language", "vi")
    expect(readStorage("language")).toBe("vi")
  })

  it("ignores storage errors", () => {
    const original = window.localStorage
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => { throw new Error("storage unavailable") },
    })

    expect(() => readStorage("language")).not.toThrow()
    expect(() => writeStorage("language", "vi")).not.toThrow()

    Object.defineProperty(window, "localStorage", { configurable: true, value: original })
  })
})
