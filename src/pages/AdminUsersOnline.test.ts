import { createElement } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AdminPage } from "./AdminPage"

const api = vi.hoisted(() => ({
  users: vi.fn(), events: vi.fn(), attempts: vi.fn(), payments: vi.fn(), products: vi.fn(), supports: vi.fn(),
  history: vi.fn(), recipients: vi.fn(),
  remove: vi.fn(), channel: vi.fn(), on: vi.fn(), subscribe: vi.fn(),
}))
vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ profile: null, signOut: vi.fn() }) }))
vi.mock("@/lib/supabase", () => ({ supabase: { channel: api.channel, removeChannel: api.remove } }))
vi.mock("@/hooks/useOnlinePresence", () => ({ useOnlineUserIds: () => new Set(["u1"]) }))
vi.mock("@/features/notifications/api/notifications", () => ({ fetchAdminNotificationHistory: api.history, fetchNotificationRecipients: api.recipients, fetchNotificationBatchRecipients: vi.fn(), fetchNotificationBatchDetails: vi.fn(), sendAdminNotifications: vi.fn(), revokeAdminNotification: vi.fn() }))
vi.mock("@/features/admin/api/adminUsers", () => ({ fetchAllAdminUsers: api.users }))
vi.mock("@/features/admin/api/adminActivity", () => ({ fetchAllActivityTimeline: api.events, fetchAllPracticeAttempts: api.attempts, fetchUserActivity: vi.fn(), fetchPracticeAttempts: vi.fn() }))
vi.mock("@/features/admin/api/adminPayments", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/features/admin/api/adminPayments")>()), fetchAllAdminPayments: api.payments }))
vi.mock("@/features/admin/api/adminEntitlements", () => ({ fetchAdminProducts: api.products, grantAdminPurchase: vi.fn() }))
vi.mock("@/features/support/api/supportReports", () => ({ fetchSupportReports: api.supports, updateSupportStatus: vi.fn() }))

const tick = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(350) }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  window.history.replaceState({}, "", "/admin/users")
  api.users.mockResolvedValue({
    ok: true,
    users: [
      { id: "u1", email: "a@test", displayName: "Alice", avatarUrl: null, role: "user", status: "active", createdAt: null, attempts: 5, averageAccuracy: 80, totalDurationSeconds: 60, subjectsReviewed: 1, points: 10, weekAttempts: 1, weekAverageAccuracy: 80, weekPoints: 2, leaderboardVisible: true, lastActiveAt: "2026-09-09T00:00:00Z" },
      { id: "u2", email: "b@test", displayName: "Bob", avatarUrl: null, role: "user", status: "active", createdAt: null, attempts: 3, averageAccuracy: 70, totalDurationSeconds: 30, subjectsReviewed: 1, points: 5, weekAttempts: 0, weekAverageAccuracy: 0, weekPoints: 0, leaderboardVisible: true, lastActiveAt: "2026-09-08T00:00:00Z" },
    ],
    totalUsers: 2, activeUsers: 2, blockedUsers: 0,
  })
  api.events.mockResolvedValue({ ok: true, events: [] })
  api.attempts.mockResolvedValue({ ok: true, attempts: [] })
  api.payments.mockResolvedValue({ ok: true, payments: [] })
  api.products.mockResolvedValue([])
  api.supports.mockResolvedValue([])
  api.history.mockResolvedValue([])
  api.recipients.mockResolvedValue({ items: [], total: 0, activeTotal: 0 })
  const channel = { on: api.on, subscribe: api.subscribe }
  api.channel.mockReturnValue(channel)
  api.on.mockReturnValue(channel)
  api.subscribe.mockReturnValue(channel)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

describe("admin users online filter", () => {
  it("shows online count, marks online users, and filters to online only", async () => {
    render(createElement(AdminPage, { lang: "vi" })); await tick()
    expect(screen.queryByText("Đã xảy ra lỗi")).toBeNull()
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: /Đang online \(1\)/ })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Đang online/ }))
    await tick()
    expect(screen.queryByText("Đã xảy ra lỗi")).toBeNull()
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
    expect(screen.queryByText("Bob")).toBeNull()
  })
})
