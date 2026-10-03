import { supabase } from "@/lib/supabase"

export type NotificationCursor = { createdAt: string; id: number }

export type UserNotification = {
  id: number
  batchId: number
  title: string
  message: string
  readAt: string | null
  createdAt: string
  isDirect: boolean
}

export type AdminNotificationHistory = {
  id: number
  title: string
  message: string
  readAt: null
  createdAt: string
  isDirect: boolean
  recipientCount: number
  revokedAt: string | null
  legacy: boolean
  recipients: Array<NotificationRecipient & { readAt: string | null }>
}

export type NotificationRecipient = {
  id: string
  email: string | null
  displayName: string | null
}

type NotificationRow = {
  id: number
  batch_id: number
  title: string
  message: string
  read_at: string | null
  created_at: string
  is_direct: boolean
}

type RecipientRow = { id: string; email: string | null; display_name: string | null }

function notificationError(error: { message: string }): Error {
  return error instanceof Error ? error : new Error(error.message, { cause: error })
}

export function parseNotification(row: NotificationRow): UserNotification {
  return {
    id: row.id,
    batchId: row.batch_id,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
    isDirect: row.is_direct,
  }
}

export async function fetchNotifications(
  cursor?: NotificationCursor,
  options?: { unreadOnly?: boolean; directOnly?: boolean },
): Promise<UserNotification[]> {
  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: 30,
    p_unread_only: options?.unreadOnly ?? false,
    p_direct_only: options?.directOnly ?? false,
  })
  if (error) throw notificationError(error)
  return ((data ?? []) as NotificationRow[]).map(parseNotification)
}

export type NotificationDigest = {
  unreadCount: number
  direct: UserNotification | null
  itemsAll: UserNotification[]
  itemsUnread: UserNotification[] | null
}

/** Một round-trip thay cho cặp count + list trực tiếp (xem get_my_notification_digest). */
export async function fetchNotificationDigest(options: {
  includeUnread: boolean
  dismissedIds: number[]
}): Promise<NotificationDigest> {
  const { data, error } = await supabase.rpc("get_my_notification_digest", {
    p_include_unread: options.includeUnread,
    p_dismissed_ids: options.dismissedIds.slice(0, 100),
    p_limit: 30,
  })
  if (error) throw notificationError(error)
  const result = (data ?? {}) as {
    unread_count?: number
    direct?: NotificationRow | null
    items_all?: NotificationRow[] | null
    items_unread?: NotificationRow[] | null
  }
  return {
    unreadCount: Number(result.unread_count ?? 0),
    direct: result.direct ? parseNotification(result.direct) : null,
    itemsAll: (result.items_all ?? []).map(parseNotification),
    itemsUnread: result.items_unread === null || result.items_unread === undefined
      ? null
      : result.items_unread.map(parseNotification),
  }
}

export async function fetchAdminNotificationHistory(cursor?: NotificationCursor): Promise<AdminNotificationHistory[]> {
  const { data, error } = await supabase.rpc("list_notification_batches", {
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: 30,
  })
  if (error) throw notificationError(error)
  const rows = (data ?? []) as Array<Omit<NotificationRow, "batch_id" | "read_at"> & {
    recipient_count: number; revoked_at: string | null; legacy: boolean
  }>
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    readAt: null,
    createdAt: row.created_at,
    isDirect: row.is_direct,
    recipientCount: row.recipient_count,
    revokedAt: row.revoked_at,
    legacy: row.legacy,
    recipients: [],
  }))
}

export async function fetchNotificationBatchDetails(batchId: number): Promise<(AdminNotificationHistory & {
  remainingCount: number; readCount: number; unreadCount: number
}) | null> {
  const { data, error } = await supabase.rpc("get_notification_batch_details", { p_batch_id: batchId })
  if (error) throw notificationError(error)
  if (data === null) return null
  const row = data as Omit<NotificationRow, "batch_id" | "read_at"> & {
    recipient_count: number; revoked_at: string | null; legacy: boolean
    remaining_count: number; read_count: number; unread_count: number
  }
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    readAt: null,
    createdAt: row.created_at,
    isDirect: row.is_direct,
    recipientCount: row.recipient_count,
    revokedAt: row.revoked_at,
    legacy: row.legacy,
    recipients: [],
    remainingCount: row.remaining_count,
    readCount: row.read_count,
    unreadCount: row.unread_count,
  }
}

export async function fetchNotificationBatchRecipients(
  batchId: number, afterId?: string, readOnly = true,
): Promise<AdminNotificationHistory["recipients"]> {
  const { data, error } = await supabase.rpc("list_notification_batch_recipients", {
    p_batch_id: batchId,
    p_after_id: afterId ?? null,
    p_limit: 50,
    p_read_only: readOnly,
  })
  if (error) throw notificationError(error)
  return ((data ?? []) as Array<RecipientRow & { read_at: string | null }>).map((row) => ({
    id: row.id, email: row.email, displayName: row.display_name, readAt: row.read_at,
  }))
}

export async function revokeAdminNotification(id: number): Promise<void> {
  const { data, error } = await supabase.rpc("revoke_notification_batch", { p_batch_id: id })
  if (error) throw notificationError(error)
  if (data === false) throw new Error("Notification batch not found")
}

export async function markNotificationRead(id: number): Promise<void> {
  const { error } = await supabase.rpc("acknowledge_notification", { p_notification_id: id })
  if (error) throw notificationError(error)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("acknowledge_notification", { p_notification_id: null })
  if (error) throw notificationError(error)
}

export async function fetchNotificationRecipients(query = "", offset = 0): Promise<{
  items: NotificationRecipient[]; total: number; activeTotal: number
}> {
  const { data, error } = await supabase.rpc("search_notification_recipients", {
    p_query: query, p_offset: offset, p_limit: 30,
  })
  if (error) throw notificationError(error)
  const result = data as { items: RecipientRow[]; total: number; active_total: number }
  return {
    items: result.items.map((row) => ({ id: row.id, email: row.email, displayName: row.display_name })),
    total: result.total,
    activeTotal: result.active_total,
  }
}

export async function sendAdminNotifications(input: {
  title: string
  message: string
  audienceMode: "selected" | "all"
  recipientIds: string[]
  idempotencyKey: string
}): Promise<{ id: number; recipientCount: number }> {
  if (input.audienceMode !== "selected" && input.audienceMode !== "all") {
    throw new Error("An explicit notification audience is required")
  }
  const recipientIds = input.audienceMode === "all" ? [] : [...new Set(input.recipientIds)].sort()
  if (input.audienceMode === "selected" && recipientIds.length === 0) {
    throw new Error("Select at least one notification recipient")
  }
  const { data, error } = await supabase.rpc("send_notification_batch", {
    p_title: input.title,
    p_message: input.message,
    p_audience_mode: input.audienceMode,
    p_recipient_ids: recipientIds,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throw notificationError(error)
  const result = data as { id: number; recipient_count: number }
  return { id: result.id, recipientCount: result.recipient_count }
}
