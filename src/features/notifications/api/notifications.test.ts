import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchAdminNotificationHistory, fetchNotificationBatchDetails, fetchNotificationBatchRecipients, fetchNotificationRecipients,
  fetchNotifications, fetchUnreadDirectNotification, fetchUnreadNotificationCount,
  markAllNotificationsRead, markNotificationRead, parseNotification,
  revokeAdminNotification, sendAdminNotifications,
} from "./notifications"

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }))

const createdAt = "2026-09-09T21:00:00Z"
const row = { id: 42, batch_id: 7, title: "Title", message: "Message", read_at: null, created_at: createdAt, is_direct: true }
const input = {
  title: "Title", message: "Message", audienceMode: "selected" as const,
  recipientIds: ["user-b", "user-a", "user-b"], idempotencyKey: "8d08d6ce-e733-4b0f-9592-786de46e57a3",
}

beforeEach(() => {
  rpc.mockReset()
  rpc.mockResolvedValue({ data: null, error: null })
})

describe("notification batches API", () => {
  it("sends multiple targets in one RPC with sorted unique IDs without mutating the request", async () => {
    rpc.mockResolvedValue({ data: { id: 7, recipient_count: 2 }, error: null })
    await expect(sendAdminNotifications(input)).resolves.toEqual({ id: 7, recipientCount: 2 })
    expect(rpc).toHaveBeenCalledExactlyOnceWith("send_notification_batch", {
      p_title: "Title", p_message: "Message", p_audience_mode: "selected",
      p_recipient_ids: ["user-a", "user-b"], p_idempotency_key: input.idempotencyKey,
    })
    expect(input.recipientIds).toEqual(["user-b", "user-a", "user-b"])
  })

  it("reuses the provided idempotency key and canonical payload after a failed request", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Connection lost" } })
    rpc.mockResolvedValueOnce({ data: { id: 7, recipient_count: 2 }, error: null })
    await expect(sendAdminNotifications(input)).rejects.toThrow("Connection lost")
    await expect(sendAdminNotifications({ ...input, recipientIds: ["user-a", "user-b"] })).resolves.toEqual({ id: 7, recipientCount: 2 })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1])
    expect(rpc.mock.calls[1][1].p_idempotency_key).toBe(input.idempotencyKey)
  })

  it("never turns an empty selection or an omitted audience into a broadcast", async () => {
    await expect(sendAdminNotifications({ ...input, recipientIds: [] })).rejects.toThrow("Select at least one")
    // Exercise callers without TypeScript validation as well.
    // @ts-expect-error An audience must be explicitly selected.
    await expect(sendAdminNotifications({ title: "Title", message: "Message", recipientIds: [], idempotencyKey: input.idempotencyKey })).rejects.toThrow("explicit")
    expect(rpc).not.toHaveBeenCalled()
  })

  it("sends an empty ID array only for an explicit all audience", async () => {
    rpc.mockResolvedValue({ data: { id: 8, recipient_count: 1200 }, error: null })
    await expect(sendAdminNotifications({ ...input, audienceMode: "all" })).resolves.toEqual({ id: 8, recipientCount: 1200 })
    expect(rpc).toHaveBeenCalledExactlyOnceWith("send_notification_batch", expect.objectContaining({ p_audience_mode: "all", p_recipient_ids: [] }))
  })

  it("maps inbox rows and forwards both cursor fields and filters for a page of 30", async () => {
    rpc.mockResolvedValue({ data: [row], error: null })
    const expected = { id: 42, batchId: 7, title: "Title", message: "Message", readAt: null, createdAt, isDirect: true }
    expect(parseNotification(row)).toEqual(expected)
    await expect(fetchNotifications({ createdAt, id: 43 }, { unreadOnly: true, directOnly: true })).resolves.toEqual([expected])
    expect(rpc).toHaveBeenCalledExactlyOnceWith("list_my_notifications", {
      p_before_created_at: createdAt, p_before_id: 43, p_limit: 30, p_unread_only: true, p_direct_only: true,
    })
  })

  it("starts the inbox without a cursor or implicit filters", async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    await expect(fetchNotifications()).resolves.toEqual([])
    expect(rpc).toHaveBeenCalledExactlyOnceWith("list_my_notifications", {
      p_before_created_at: null, p_before_id: null, p_limit: 30, p_unread_only: false, p_direct_only: false,
    })
  })

  it("fetches only the first unread direct notification and handles an empty inbox", async () => {
    rpc.mockResolvedValueOnce({ data: [row], error: null }).mockResolvedValueOnce({ data: [], error: null })
    await expect(fetchUnreadDirectNotification()).resolves.toEqual(parseNotification(row))
    expect(rpc).toHaveBeenLastCalledWith("list_my_notifications", {
      p_before_created_at: null, p_before_id: null, p_limit: 1, p_unread_only: true, p_direct_only: true,
    })
    await expect(fetchUnreadDirectNotification()).resolves.toBeNull()
  })

  it("gets the server's unread count rather than counting a page", async () => {
    rpc.mockResolvedValue({ data: 305, error: null })
    await expect(fetchUnreadNotificationCount()).resolves.toBe(305)
    expect(rpc).toHaveBeenCalledExactlyOnceWith("count_my_unread_notifications")
  })

  it("maps batch history without grouping similar batches or eagerly fetching recipients", async () => {
    const batch = { id: 7, title: "Title", message: "Message", created_at: createdAt, is_direct: true, recipient_count: 55, revoked_at: createdAt, legacy: true }
    rpc.mockResolvedValue({ data: [batch, { ...batch, id: 6, legacy: false }], error: null })
    const history = await fetchAdminNotificationHistory({ createdAt, id: 8 })
    expect(history).toEqual([
      { id: 7, title: "Title", message: "Message", createdAt, isDirect: true, recipientCount: 55, revokedAt: createdAt, legacy: true, readAt: null, recipients: [] },
      { id: 6, title: "Title", message: "Message", createdAt, isDirect: true, recipientCount: 55, revokedAt: createdAt, legacy: false, readAt: null, recipients: [] },
    ])
    expect(rpc).toHaveBeenCalledExactlyOnceWith("list_notification_batches", { p_before_created_at: createdAt, p_before_id: 8, p_limit: 30 })
  })

  it.each([
    { remainingCount: 50, readCount: 20, unreadCount: 30, revokedAt: createdAt, legacy: true, isDirect: true },
    { remainingCount: 0, readCount: 0, unreadCount: 0, revokedAt: null, legacy: false, isDirect: false },
  ])("maps batch details and server counts: %j", async (details) => {
    rpc.mockResolvedValue({ data: {
      id: 7, title: "Title", message: "Message", created_at: createdAt,
      is_direct: details.isDirect, recipient_count: 55, revoked_at: details.revokedAt, legacy: details.legacy,
      remaining_count: details.remainingCount, read_count: details.readCount, unread_count: details.unreadCount,
    }, error: null })
    await expect(fetchNotificationBatchDetails(7)).resolves.toEqual({
      id: 7, title: "Title", message: "Message", createdAt, recipientCount: 55,
      readAt: null, recipients: [], ...details,
    })
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_notification_batch_details", { p_batch_id: 7 })
  })

  it("returns null when batch details are absent", async () => {
    await expect(fetchNotificationBatchDetails(999)).resolves.toBeNull()
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_notification_batch_details", { p_batch_id: 999 })
  })

  it("pages batch recipients by UUID in pages of 50 and maps read timestamps", async () => {
    rpc.mockResolvedValue({ data: [{ id: "user-b", display_name: null, email: null, read_at: createdAt }], error: null })
    await expect(fetchNotificationBatchRecipients(7, "user-a")).resolves.toEqual([{ id: "user-b", displayName: null, email: null, readAt: createdAt }])
    expect(rpc).toHaveBeenLastCalledWith("list_notification_batch_recipients", { p_batch_id: 7, p_after_id: "user-a", p_limit: 50 })
    await fetchNotificationBatchRecipients(7)
    expect(rpc).toHaveBeenLastCalledWith("list_notification_batch_recipients", { p_batch_id: 7, p_after_id: null, p_limit: 50 })
  })

  it("maps recipient search pagination and keeps matched and active totals distinct", async () => {
    rpc.mockResolvedValue({ data: { items: [{ id: "user-a", email: "a@example.com", display_name: "A" }], total: 40, active_total: 1200 }, error: null })
    await expect(fetchNotificationRecipients("a", 30)).resolves.toEqual({ items: [{ id: "user-a", email: "a@example.com", displayName: "A" }], total: 40, activeTotal: 1200 })
    expect(rpc).toHaveBeenLastCalledWith("search_notification_recipients", { p_query: "a", p_offset: 30, p_limit: 30 })
    await fetchNotificationRecipients()
    expect(rpc).toHaveBeenLastCalledWith("search_notification_recipients", { p_query: "", p_offset: 0, p_limit: 30 })
  })

  it("acknowledges one or all notifications using server timestamps, never a client write", async () => {
    await markNotificationRead(42)
    await markAllNotificationsRead()
    expect(rpc.mock.calls).toEqual([
      ["acknowledge_notification", { p_notification_id: 42 }],
      ["acknowledge_notification", { p_notification_id: null }],
    ])
  })

  it("rejects a missing batch on revoke and accepts a successful revoke", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null })
    await expect(revokeAdminNotification(7)).rejects.toThrow("not found")
    await expect(revokeAdminNotification(7)).resolves.toBeUndefined()
    expect(rpc).toHaveBeenLastCalledWith("revoke_notification_batch", { p_batch_id: 7 })
  })

  it.each([
    ["inbox", () => fetchNotifications()],
    ["direct", () => fetchUnreadDirectNotification()],
    ["count", () => fetchUnreadNotificationCount()],
    ["history", () => fetchAdminNotificationHistory()],
    ["batch details", () => fetchNotificationBatchDetails(7)],
    ["batch recipients", () => fetchNotificationBatchRecipients(7)],
    ["search", () => fetchNotificationRecipients()],
    ["mark one", () => markNotificationRead(42)],
    ["mark all", () => markAllNotificationsRead()],
    ["revoke", () => revokeAdminNotification(7)],
    ["send", () => sendAdminNotifications(input)],
  ])("normalizes plain PostgREST errors for %s", async (_name, call) => {
    const error = { message: "Active administrator required", code: "42501", details: "", hint: "" }
    rpc.mockResolvedValue({ data: null, error })
    await expect(call()).rejects.toBeInstanceOf(Error)
    await expect(call()).rejects.toMatchObject({ message: error.message, cause: error })
  })

  it("preserves existing Error instances", async () => {
    const error = new Error("Network failure")
    rpc.mockResolvedValue({ data: null, error })
    await expect(fetchNotifications()).rejects.toBe(error)
  })
})
