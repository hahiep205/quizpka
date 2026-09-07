import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UserNotification } from "./api/notifications"
import { useNotifications } from "./useNotifications"

const mocks = vi.hoisted(() => ({
  userId: "",
  fetchNotifications: vi.fn(),
  fetchUnreadDirectNotification: vi.fn(),
  fetchUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: mocks.userId }, profile: { id: mocks.userId, status: "active" } }),
}))
vi.mock("./api/notifications", () => ({
  fetchNotifications: mocks.fetchNotifications,
  fetchUnreadDirectNotification: mocks.fetchUnreadDirectNotification,
  fetchUnreadNotificationCount: mocks.fetchUnreadNotificationCount,
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
}))
vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
    auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange },
  },
}))

type Handler = { config: { event: string; table: string; filter?: string }; callback: () => void }
let handlers: Handler[]
let unsubscribe: ReturnType<typeof vi.fn>
let authChanged: (event: string, session: { user: { id: string } } | null) => void
let subscribed: (status: string) => void
let nextUser = 0

function notification(id: number, direct = false): UserNotification {
  return { id, batchId: id, title: `Notice ${id}`, message: "Message", readAt: null, createdAt: "2026-09-07T00:00:00Z", isDirect: direct }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
async function tick(ms = 250) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}
function emit(table: string, event = "UPDATE") {
  act(() => {
    const handler = handlers.find((entry) => entry.config.table === table && entry.config.event === event)
    expect(handler).toBeDefined()
    handler!.callback()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  mocks.userId = `user-${++nextUser}`
  handlers = []
  unsubscribe = vi.fn()
  mocks.fetchNotifications.mockResolvedValue([])
  mocks.fetchUnreadDirectNotification.mockResolvedValue(null)
  mocks.fetchUnreadNotificationCount.mockResolvedValue(0)
  mocks.markNotificationRead.mockResolvedValue(undefined)
  mocks.markAllNotificationsRead.mockResolvedValue(undefined)
  mocks.getSession.mockImplementation(async () => ({ data: { session: { user: { id: mocks.userId } } }, error: null }))
  mocks.onAuthStateChange.mockImplementation((callback) => {
    authChanged = callback
    return { data: { subscription: { unsubscribe } } }
  })
  mocks.channel.mockImplementation(() => {
    const channel = {
      on: vi.fn((_kind: string, config: Handler["config"], callback: () => void) => {
        handlers.push({ config, callback })
        return channel
      }),
      subscribe: vi.fn((callback: (status: string) => void) => { subscribed = callback; return channel }),
    }
    return channel
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("useNotifications", () => {
  it("shares one subscription and exact count across consumers, disposing after the last unmount", async () => {
    mocks.fetchNotifications.mockResolvedValue([notification(1)])
    mocks.fetchUnreadNotificationCount.mockResolvedValue(127)
    const list = renderHook(() => useNotifications("all"))
    const badge = renderHook(() => useNotifications())
    await tick()

    expect(mocks.channel).toHaveBeenCalledTimes(1)
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(list.result.current.page.items).toHaveLength(1)
    expect(list.result.current.unreadCount).toBe(127)
    expect(badge.result.current.unreadCount).toBe(127)
    expect(handlers.map(({ config }) => config)).toEqual([
      { event: "INSERT", schema: "public", table: "notification_recipients", filter: `recipient_id=eq.${mocks.userId}` },
      { event: "UPDATE", schema: "public", table: "notification_recipients", filter: `recipient_id=eq.${mocks.userId}` },
      { event: "UPDATE", schema: "public", table: "notification_batch_events" },
    ])

    list.unmount()
    expect(mocks.removeChannel).not.toHaveBeenCalled()
    badge.unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    const calls = mocks.fetchUnreadNotificationCount.mock.calls.length
    await tick(120_000)
    act(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("online")) })
    await tick()
    expect(mocks.fetchUnreadNotificationCount).toHaveBeenCalledTimes(calls)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("uses server unread filtering and resets both cached lists to one page on polling", async () => {
    const first = Array.from({ length: 30 }, (_, i) => notification(100 - i))
    mocks.fetchNotifications.mockImplementation(async (cursor) => cursor ? [notification(1)] : first)
    const hook = renderHook(({ filter }: { filter: "all" | "unread" }) => useNotifications(filter), { initialProps: { filter: "all" } })
    await tick()
    await act(async () => { await hook.result.current.loadMore() })
    expect(hook.result.current.page.items).toHaveLength(31)
    expect(mocks.fetchNotifications).toHaveBeenLastCalledWith({ createdAt: first[29].createdAt, id: first[29].id }, { unreadOnly: false })

    hook.rerender({ filter: "unread" })
    await tick()
    await act(async () => { await hook.result.current.loadMore() })
    expect(mocks.fetchNotifications).toHaveBeenLastCalledWith({ createdAt: first[29].createdAt, id: first[29].id }, { unreadOnly: true })
    expect(hook.result.current.page.items).toHaveLength(31)
    mocks.fetchNotifications.mockClear()
    await tick(60_000)
    expect(mocks.fetchNotifications.mock.calls).toEqual([
      [undefined, { unreadOnly: false }],
      [undefined, { unreadOnly: true }],
    ])
    expect(hook.result.current.all.items).toHaveLength(30)
    expect(hook.result.current.unread.items).toHaveLength(30)
    expect(hook.result.current.page.pages).toBe(1)
    expect(hook.result.current.page.hasMore).toBe(true)
  })

  it.each(["single", "all"])("rejects %s read failures and shares the error without acknowledging the popup", async (kind) => {
    const item = notification(1, true)
    mocks.fetchNotifications.mockResolvedValue([item])
    mocks.fetchUnreadDirectNotification.mockResolvedValue(item)
    mocks.fetchUnreadNotificationCount.mockResolvedValue(40)
    const failure = new Error("Acknowledgment failed")
    mocks.markNotificationRead.mockRejectedValue(failure)
    mocks.markAllNotificationsRead.mockRejectedValue(failure)
    const list = renderHook(() => useNotifications("unread"))
    const popup = renderHook(() => useNotifications())
    await tick()
    await act(async () => {
      await expect(kind === "single" ? list.result.current.markRead(1) : list.result.current.markAllRead()).rejects.toThrow("Acknowledgment failed")
    })
    expect(list.result.current.mutationError).toBe("Acknowledgment failed")
    expect(popup.result.current.mutationError).toBe("Acknowledgment failed")
    expect(popup.result.current.direct).toEqual(item)
    expect(list.result.current.page.items[0].readAt).toBeNull()
    expect(list.result.current.unreadCount).toBe(40)
    expect(list.result.current.mutating).toBe(false)
  })

  it("ignores old user query results after switching accounts", async () => {
    const oldList = deferred<UserNotification[]>()
    const oldCount = deferred<number>()
    const oldDirect = deferred<UserNotification | null>()
    mocks.fetchNotifications.mockReturnValue(oldList.promise)
    mocks.fetchUnreadNotificationCount.mockReturnValue(oldCount.promise)
    mocks.fetchUnreadDirectNotification.mockReturnValue(oldDirect.promise)
    const hook = renderHook(() => useNotifications("all"))
    await tick()
    mocks.userId = `user-${++nextUser}`
    mocks.fetchNotifications.mockResolvedValue([notification(2)])
    mocks.fetchUnreadNotificationCount.mockResolvedValue(8)
    mocks.fetchUnreadDirectNotification.mockResolvedValue(notification(2, true))
    hook.rerender()
    expect(hook.result.current.page.items).toEqual([])
    expect(hook.result.current.direct).toBeNull()
    await tick()
    await act(async () => {
      oldList.resolve([notification(1)])
      oldCount.resolve(99)
      oldDirect.resolve(notification(1, true))
    })
    expect(hook.result.current.page.items.map((item) => item.id)).toEqual([2])
    expect(hook.result.current.direct?.id).toBe(2)
    expect(hook.result.current.unreadCount).toBe(8)
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
  })

  it("ignores a pending mutation after sign-out and a new user mount", async () => {
    const write = deferred<void>()
    mocks.markNotificationRead.mockReturnValue(write.promise)
    mocks.fetchUnreadDirectNotification.mockResolvedValue(notification(1, true))
    const hook = renderHook(() => useNotifications())
    await tick()
    let mutation!: Promise<void>
    await act(async () => { mutation = hook.result.current.markRead(1) })
    expect(hook.result.current.mutating).toBe(true)
    act(() => authChanged("SIGNED_OUT", null))
    expect(hook.result.current.direct).toBeNull()
    mocks.userId = `user-${++nextUser}`
    mocks.fetchUnreadDirectNotification.mockResolvedValue(notification(2, true))
    mocks.fetchUnreadNotificationCount.mockResolvedValue(7)
    hook.rerender()
    await tick()
    const calls = mocks.fetchUnreadNotificationCount.mock.calls.length
    await act(async () => { write.resolve(); await mutation })
    expect(hook.result.current.direct?.id).toBe(2)
    expect(hook.result.current.unreadCount).toBe(7)
    expect(hook.result.current.mutationError).toBeNull()
    expect(mocks.fetchUnreadNotificationCount).toHaveBeenCalledTimes(calls)
  })

  it("clears revoked content immediately and rejects stale in-flight pagination", async () => {
    const first = Array.from({ length: 30 }, (_, i) => notification(100 - i))
    mocks.fetchNotifications.mockResolvedValue(first)
    mocks.fetchUnreadDirectNotification.mockResolvedValue(notification(100, true))
    mocks.fetchUnreadNotificationCount.mockResolvedValue(30)
    const hook = renderHook(() => useNotifications("all"))
    await tick()
    const pending = deferred<UserNotification[]>()
    mocks.fetchNotifications.mockReturnValueOnce(pending.promise)
    let more!: Promise<void>
    act(() => { more = hook.result.current.loadMore() })
    emit("notification_batch_events")
    expect(hook.result.current.page.items).toEqual([])
    expect(hook.result.current.page.hasMore).toBe(false)
    expect(hook.result.current.page.loading).toBe(true)
    expect(hook.result.current.direct).toBeNull()
    await act(async () => { pending.resolve([notification(1)]); await more })
    expect(hook.result.current.page.items).toEqual([])
    mocks.fetchNotifications.mockResolvedValue([])
    mocks.fetchUnreadDirectNotification.mockResolvedValue(null)
    mocks.fetchUnreadNotificationCount.mockResolvedValue(0)
    await tick()
    expect(hook.result.current.page.items).toEqual([])
    expect(hook.result.current.page.loading).toBe(false)
    expect(hook.result.current.unreadCount).toBe(0)
  })

  it("debounces recipient updates and synchronizes another tab's acknowledgment", async () => {
    const item = notification(1, true)
    mocks.fetchNotifications.mockResolvedValue([item])
    mocks.fetchUnreadDirectNotification.mockResolvedValue(item)
    mocks.fetchUnreadNotificationCount.mockResolvedValue(1)
    const hook = renderHook(() => useNotifications("unread"))
    await tick()
    mocks.fetchNotifications.mockClear().mockResolvedValue([])
    mocks.fetchUnreadDirectNotification.mockResolvedValue(null)
    mocks.fetchUnreadNotificationCount.mockClear().mockResolvedValue(0)
    emit("notification_recipients")
    emit("notification_recipients")
    emit("notification_recipients", "INSERT")
    await tick(249)
    expect(mocks.fetchNotifications).not.toHaveBeenCalled()
    await tick(1)
    expect(mocks.fetchNotifications).toHaveBeenCalledTimes(1)
    expect(mocks.fetchUnreadNotificationCount).toHaveBeenCalledTimes(1)
    expect(hook.result.current.direct).toBeNull()
    expect(hook.result.current.page.items).toEqual([])
    expect(hook.result.current.unreadCount).toBe(0)
  })

  it("advances direct notifications after reads, preserves dismissals, and receives new deliveries", async () => {
    const first = notification(3, true)
    const second = notification(2, true)
    mocks.fetchUnreadDirectNotification.mockResolvedValue(first)
    const hook = renderHook(() => useNotifications())
    await tick()
    mocks.fetchUnreadDirectNotification.mockResolvedValue(second)
    await act(async () => { await hook.result.current.markRead(first.id) })
    expect(hook.result.current.direct).toEqual(second)
    mocks.fetchNotifications.mockResolvedValue([second, notification(1, true)])
    act(() => hook.result.current.dismissDirect())
    await tick()
    expect(hook.result.current.direct?.id).toBe(1)
    hook.unmount()
    const remount = renderHook(() => useNotifications())
    await tick()
    expect(remount.result.current.direct?.id).toBe(1)
    mocks.fetchUnreadDirectNotification.mockResolvedValue(notification(4, true))
    emit("notification_recipients", "INSERT")
    await tick()
    expect(remount.result.current.direct?.id).toBe(4)
  })

  it("refreshes on focus, online and subscription recovery", async () => {
    const hook = renderHook(() => useNotifications())
    await tick()
    mocks.fetchUnreadNotificationCount.mockClear().mockResolvedValue(12)
    act(() => {
      window.dispatchEvent(new Event("focus"))
      window.dispatchEvent(new Event("online"))
      subscribed("SUBSCRIBED")
    })
    await tick()
    expect(mocks.fetchUnreadNotificationCount).toHaveBeenCalledTimes(1)
    expect(hook.result.current.unreadCount).toBe(12)
  })
})
