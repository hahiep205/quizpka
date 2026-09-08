import { createElement } from "react"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useOnlinePresence, useOnlineUserIds } from "./useOnlinePresence"

const syncCallbacks: Array<() => void> = []
const presenceState: Record<string, Array<{ online_at: string }>> = {
  "user:u1": [{ online_at: "2026-09-09T00:00:00Z" }],
  "user:u2": [{ online_at: "2026-09-09T00:00:00Z" }],
  "visitor:abc": [{ online_at: "2026-09-09T00:00:00Z" }],
}
const api = vi.hoisted(() => ({ channel: vi.fn(), remove: vi.fn(), on: vi.fn(), subscribe: vi.fn(), track: vi.fn(), untrack: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ supabase: { channel: api.channel, removeChannel: api.remove } }))

function Probe() {
  const count = useOnlinePresence("admin-1")
  const ids = useOnlineUserIds()
  return createElement("div", null, `count:${count} ids:${[...ids].sort().join(",")}`)
}

beforeEach(() => {
  vi.resetAllMocks()
  syncCallbacks.length = 0
  api.channel.mockImplementation(() => {
    const channel: Record<string, unknown> = {
      presenceState: () => presenceState,
      track: api.track,
      untrack: api.untrack,
      on: vi.fn((...args: unknown[]) => {
        if (args[0] === "presence") syncCallbacks.push(args[2] as () => void)
        return channel
      }),
      subscribe: api.subscribe.mockImplementation(() => channel),
    }
    return channel
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("useOnlinePresence shared store", () => {
  it("feeds one subscription into both count and user ids (visitors excluded)", () => {
    render(createElement(Probe))
    expect(screen.getByText("count:0 ids:")).toBeTruthy()
    act(() => { syncCallbacks.forEach((cb) => cb()) })
    expect(screen.getByText("count:3 ids:u1,u2")).toBeTruthy()
    expect(api.channel).toHaveBeenCalledTimes(1)
  })
})
