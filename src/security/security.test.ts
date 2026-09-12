import { describe, expect, it } from "vitest"
import { isBlockedShortcut } from "@/security/blockAll"
import { isLocalSecurityBypass } from "@/security/config"

function keyEvent(init: Partial<KeyboardEvent>): KeyboardEvent {
  return { key: "", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...init } as KeyboardEvent
}

describe("security environment gate", () => {
  it("bypasses localhost variants but not production hosts", () => {
    expect(isLocalSecurityBypass("localhost")).toBe(true)
    expect(isLocalSecurityBypass("127.0.0.1")).toBe(true)
    expect(isLocalSecurityBypass("[::1]")).toBe(true)
    expect(isLocalSecurityBypass("")).toBe(true)
    expect(isLocalSecurityBypass("quizpka.online")).toBe(false)
    expect(isLocalSecurityBypass("www.quizpka.online")).toBe(false)
  })
})

describe("blocked shortcuts (production only)", () => {
  it("blocks F12 and devtools chords", () => {
    expect(isBlockedShortcut(keyEvent({ key: "F12" }))).toBe(true)
    expect(isBlockedShortcut(keyEvent({ key: "I", ctrlKey: true, shiftKey: true }))).toBe(true)
    expect(isBlockedShortcut(keyEvent({ key: "j", ctrlKey: true, shiftKey: true }))).toBe(true)
    expect(isBlockedShortcut(keyEvent({ key: "c", ctrlKey: true, shiftKey: true }))).toBe(true)
    expect(isBlockedShortcut(keyEvent({ key: "i", metaKey: true, altKey: true }))).toBe(true)
  })

  it("keeps blocking save/view-source keys", () => {
    expect(isBlockedShortcut(keyEvent({ key: "s", ctrlKey: true }))).toBe(true)
    expect(isBlockedShortcut(keyEvent({ key: "u", ctrlKey: true }))).toBe(true)
  })

  it("does not block plain keys or partial chords", () => {
    expect(isBlockedShortcut(keyEvent({ key: "I" }))).toBe(false)
    expect(isBlockedShortcut(keyEvent({ key: "i", ctrlKey: true }))).toBe(false)
    expect(isBlockedShortcut(keyEvent({ key: "F5" }))).toBe(false)
  })
})
