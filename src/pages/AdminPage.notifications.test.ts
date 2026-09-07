import { createElement } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AdminPage } from "./AdminPage"

const api = vi.hoisted(() => ({
  history: vi.fn(), recipients: vi.fn(), details: vi.fn(), metadata: vi.fn(), send: vi.fn(), revoke: vi.fn(),
  users: vi.fn(), events: vi.fn(), attempts: vi.fn(), payments: vi.fn(), products: vi.fn(), supports: vi.fn(),
  on: vi.fn(), subscribe: vi.fn(), remove: vi.fn(), channel: vi.fn(),
}))
vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ profile: null, signOut: vi.fn() }) }))
vi.mock("@/lib/supabase", () => ({ supabase: { channel: api.channel, removeChannel: api.remove } }))
vi.mock("@/features/notifications/api/notifications", () => ({ fetchAdminNotificationHistory: api.history, fetchNotificationRecipients: api.recipients, fetchNotificationBatchRecipients: api.details, fetchNotificationBatchDetails: api.metadata, sendAdminNotifications: api.send, revokeAdminNotification: api.revoke }))
vi.mock("@/features/admin/api/adminUsers", () => ({ fetchAllAdminUsers: api.users }))
vi.mock("@/features/admin/api/adminActivity", () => ({ fetchAllActivityTimeline: api.events, fetchAllPracticeAttempts: api.attempts, fetchUserActivity: vi.fn(), fetchPracticeAttempts: vi.fn() }))
vi.mock("@/features/admin/api/adminPayments", () => ({ fetchAllAdminPayments: api.payments }))
vi.mock("@/features/admin/api/adminEntitlements", () => ({ fetchAdminProducts: api.products, grantAdminPurchase: vi.fn() }))
vi.mock("@/features/support/api/supportReports", () => ({ fetchSupportReports: api.supports, updateSupportStatus: vi.fn() }))

const recipient = { id: "user-1", displayName: "Alice", email: "alice@example.test", readAt: null }
const batch = (id: number) => ({ id, title: `Batch ${id}`, message: "Body", createdAt: "2026-09-01T00:00:00Z", recipientCount: 51, isDirect: true, revokedAt: null, legacy: false, recipients: [] })
const tick = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(350) }) }
const open = async () => { render(createElement(AdminPage, { lang: "vi" })); await tick() }
const fill = () => {
  fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Title" } })
  fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "Message" } })
}
const sendButton = () => screen.getByRole("button", { name: "Gửi thông báo" }) as HTMLButtonElement
const navigateTo = async (section: string) => {
  await act(async () => { window.history.pushState({}, "", `/admin/${section}`); window.dispatchEvent(new PopStateEvent("popstate")) })
  await tick()
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  window.history.replaceState({}, "", "/admin/notifications")
  api.history.mockResolvedValue([])
  api.recipients.mockResolvedValue({ items: [recipient], total: 61, activeTotal: 100 })
  api.details.mockResolvedValue([])
  api.metadata.mockImplementation(async (id: number) => ({ ...batch(id), remainingCount: 51, readCount: 20, unreadCount: 31 }))
  api.users.mockResolvedValue({ ok: true, users: [], totalUsers: 0, activeUsers: 0, blockedUsers: 0 })
  api.events.mockResolvedValue({ ok: true, events: [] })
  api.attempts.mockResolvedValue({ ok: true, attempts: [] })
  api.payments.mockResolvedValue({ ok: true, payments: [] })
  api.products.mockResolvedValue([])
  api.supports.mockResolvedValue([])
  const channel = { on: api.on, subscribe: api.subscribe }
  api.channel.mockReturnValue(channel)
  api.on.mockReturnValue(channel)
  api.subscribe.mockReturnValue(channel)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

describe("admin batch notifications", () => {
  it("rejects empty selection and requires explicit all-audience confirmation", async () => {
    await open(); fill()
    expect(sendButton().disabled).toBe(true)
    fireEvent.click(sendButton())
    expect(api.send).not.toHaveBeenCalled()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    fireEvent.click(screen.getByRole("radio", { name: /Tất cả/ }))
    fireEvent.click(sendButton())
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("100"))
    expect(api.send).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    api.send.mockResolvedValue({ id: 1, recipientCount: 100 })
    fireEvent.click(sendButton()); await tick()
    expect(api.send).toHaveBeenCalledWith(expect.objectContaining({ audienceMode: "all", recipientIds: [] }))
  })

  it("retains a UUID across failed retries, changes it with payload, and separates refresh failure", async () => {
    api.send.mockRejectedValue(new Error("Send failed"))
    await open(); fill(); fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(sendButton()); await tick()
    const first = api.send.mock.calls[0][0].idempotencyKey
    expect(first).toMatch(/^[\da-f-]{36}$/i)
    fireEvent.change(screen.getByRole("textbox", { name: "Tìm người nhận" }), { target: { value: "Alice" } }); await tick()
    fireEvent.click(sendButton()); await tick()
    expect(api.send.mock.calls[1][0].idempotencyKey).toBe(first)
    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Changed" } })
    api.send.mockResolvedValue({ id: 7, recipientCount: 1 })
    api.history.mockRejectedValue(new Error("History unavailable"))
    fireEvent.click(sendButton()); await tick()
    expect(api.send.mock.calls[2][0].idempotencyKey).not.toBe(first)
    expect(screen.getByText("Đã gửi thông báo tới 1 user.")).toBeTruthy()
    expect(screen.getByText(/History unavailable/)).toBeTruthy()
  })

  it("ignores stale search failures and preserves selections across server pages", async () => {
    await open(); fill(); fireEvent.click(screen.getByRole("checkbox"))
    let rejectOld!: (reason: Error) => void
    api.recipients.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject }))
    const search = screen.getByRole("textbox", { name: "Tìm người nhận" })
    fireEvent.change(search, { target: { value: "old" } }); await tick()
    expect(sendButton().disabled).toBe(true)
    fireEvent.change(search, { target: { value: "new" } }); await tick()
    await act(async () => { rejectOld(new Error("Stale failure")) })
    expect(screen.queryByText(/Stale failure/)).toBeNull()
    expect(sendButton().disabled).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Sau" })); await tick()
    expect(api.recipients).toHaveBeenLastCalledWith("new", 30)
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true)
    api.recipients.mockRejectedValueOnce(new Error("Current failure"))
    fireEvent.change(search, { target: { value: "bad" } }); await tick()
    expect(screen.getByText(/Current failure/)).toBeTruthy()
    expect(sendButton().disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await tick()
    expect(sendButton().disabled).toBe(false)
  })

  it("pages history and loads recipient details lazily with retry", async () => {
    api.history.mockResolvedValueOnce(Array.from({ length: 30 }, (_, i) => batch(i + 1))).mockResolvedValue([batch(31)])
    api.details.mockResolvedValueOnce(Array.from({ length: 50 }, (_, i) => ({ ...recipient, id: `user-${i}` }))).mockRejectedValueOnce(new Error("Details failed")).mockResolvedValue([{ ...recipient, id: "last" }])
    await open()
    expect(api.details).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm lịch sử" })); await tick()
    expect(api.history).toHaveBeenLastCalledWith({ createdAt: batch(30).createdAt, id: 30 })
    fireEvent.click(screen.getByRole("button", { name: "Batch 31" })); await tick()
    expect(api.details).toHaveBeenLastCalledWith(31, undefined)
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm người nhận" })); await tick()
    expect(api.details).toHaveBeenLastCalledWith(31, "user-49")
    expect(screen.getByText(/Details failed/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await tick()
    expect(api.details).toHaveBeenLastCalledWith(31, "user-49")
    expect(screen.queryByRole("button", { name: "Tải thêm người nhận" })).toBeNull()
  })

  it("debounces batch updates and focus without unrelated requests, and cleans up on exit", async () => {
    await open()
    const update = api.on.mock.calls.find((call) => call[1].table === "notification_batch_events")!
    expect(update[1].event).toBe("UPDATE")
    act(() => { update[2](); update[2](); window.dispatchEvent(new Event("focus")) })
    await tick()
    expect(api.history).toHaveBeenCalledTimes(2)
    expect(api.recipients).toHaveBeenCalledTimes(1)
    for (const fetch of [api.users, api.events, api.attempts, api.payments, api.products, api.supports]) expect(fetch).not.toHaveBeenCalled()
    await act(() => update[2]())
    await navigateTo("users")
    act(() => { update[2](); window.dispatchEvent(new Event("focus")) }); await tick()
    expect(api.history).toHaveBeenCalledTimes(2)
    expect(api.remove).toHaveBeenCalled()
    for (const fetch of [api.users, api.events, api.attempts]) expect(fetch).toHaveBeenCalledTimes(1)
    expect(api.payments).not.toHaveBeenCalled()
    await navigateTo("overview")
    for (const fetch of [api.users, api.events, api.attempts]) expect(fetch).toHaveBeenCalledTimes(2)
    expect(api.payments).toHaveBeenCalledTimes(1)
  })

  it("refreshes new sends and reconnects without fetching the recipient picker", async () => {
    await open()
    const insert = api.on.mock.calls.find((call) => call[1].event === "INSERT")!
    const status = api.subscribe.mock.calls[0][0]
    api.history.mockResolvedValue([batch(99)])
    act(() => { insert[2](); status("SUBSCRIBED"); status("SUBSCRIBED") }); await tick()
    expect(screen.getByRole("button", { name: "Batch 99" })).toBeTruthy()
    expect(api.history).toHaveBeenCalledTimes(2)
    await act(() => status("CHANNEL_ERROR")); await tick()
    expect(api.history).toHaveBeenCalledTimes(2)
    await act(() => status("SUBSCRIBED")); await tick()
    expect(api.history).toHaveBeenCalledTimes(3)
    expect(api.recipients).toHaveBeenCalledTimes(1)
  })

  it("refreshes an old open batch and resets recipients to page one with server counts", async () => {
    api.history.mockResolvedValueOnce(Array.from({ length: 30 }, (_, i) => batch(i + 1))).mockResolvedValueOnce([batch(31)]).mockResolvedValue([batch(1)])
    api.details.mockResolvedValueOnce(Array.from({ length: 50 }, (_, i) => ({ ...recipient, id: `user-${i}` }))).mockResolvedValueOnce([{ ...recipient, id: "last", displayName: "Last page user" }]).mockResolvedValue([{ ...recipient, displayName: "Refreshed user" }])
    await open()
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm lịch sử" })); await tick()
    fireEvent.click(screen.getByRole("button", { name: "Batch 31" })); await tick()
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm người nhận" })); await tick()
    expect(api.metadata).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Last page user")).toBeTruthy()
    fill(); await tick()
    expect(api.metadata).toHaveBeenCalledTimes(1)
    api.metadata.mockResolvedValue({ ...batch(31), revokedAt: "2026-09-02T00:00:00Z", remainingCount: 40, readCount: 30, unreadCount: 10 })
    const update = api.on.mock.calls.find((call) => call[1].event === "UPDATE")!
    act(() => { update[2](); window.dispatchEvent(new Event("focus")) }); await tick()
    expect(api.metadata).toHaveBeenLastCalledWith(31)
    expect(api.metadata).toHaveBeenCalledTimes(2)
    expect(api.details).toHaveBeenLastCalledWith(31, undefined)
    expect(screen.queryByText("Last page user")).toBeNull()
    expect(screen.getByText(/Đã thu hồi:/)).toBeTruthy()
    for (const [label, count] of [["Đã gửi ban đầu", "51"], ["Người nhận còn lại", "40"], ["Tài khoản đã xóa", "11"], ["Đã đọc", "30"], ["Chưa đọc", "10"]]) {
      expect(screen.getAllByText(label).find((element) => element.parentElement?.textContent === `${count}${label}`)).toBeTruthy()
    }
    const historyCalls = api.history.mock.calls.length
    fireEvent.click(screen.getByRole("button", { name: "Làm mới chi tiết" })); await tick()
    expect(api.metadata).toHaveBeenCalledTimes(3)
    expect(api.history).toHaveBeenCalledTimes(historyCalls)
    expect(api.recipients).toHaveBeenCalledTimes(1)
  })
})
