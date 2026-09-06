import { supabase } from "@/lib/supabase"

export type UserNotification = {
  id: number
  title: string
  message: string
  readAt: string | null
  createdAt: string
  isDirect: boolean
}

export type AdminNotificationHistory = UserNotification & {
  recipientCount: number
  revokedAt: string | null
  recipients: Array<{ id: string; displayName: string | null; email: string | null; readAt: string | null }>
}

export type NotificationRecipient = {
  id: string
  email: string | null
  displayName: string | null
}

type NotificationRow = {
  id: number
  title: string
  message: string
  read_at: string | null
  created_at: string
  is_direct: boolean
  revoked_at: string | null
  recipient_id: string
}

function parseNotification(row: NotificationRow): UserNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
    isDirect: row.is_direct,
  }
}

export async function fetchNotifications(): Promise<UserNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,read_at,created_at,is_direct,revoked_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as NotificationRow[]).filter((row) => !row.revoked_at).map(parseNotification)
}

export async function fetchUnreadDirectNotification(): Promise<UserNotification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,read_at,created_at,is_direct,revoked_at")
    .eq("is_direct", true)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? parseNotification(data as NotificationRow) : null
}

export async function fetchAdminNotificationHistory(): Promise<AdminNotificationHistory[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,read_at,created_at,is_direct,revoked_at,recipient_id")
    .order("created_at", { ascending: false })
    .limit(5000)
  if (error) throw error
  const rows = data as NotificationRow[]
  const recipientIds = [...new Set(rows.map((row) => row.recipient_id))]
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id,display_name,email").in("id", recipientIds)
  if (profilesError) throw profilesError
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const groups = new Map<string, AdminNotificationHistory>()
  for (const row of rows) {
    const createdBucket = Math.floor(Date.parse(row.created_at) / 10000)
    const key = `${row.title}\u0000${row.message}\u0000${createdBucket}\u0000${row.is_direct}`
    const current = groups.get(key)
    if (current) {
      current.recipientCount += 1
      current.recipients.push({ id: row.recipient_id, displayName: profileById.get(row.recipient_id)?.display_name ?? null, email: profileById.get(row.recipient_id)?.email ?? null, readAt: row.read_at })
      if (row.revoked_at) current.revokedAt = row.revoked_at
    } else {
      const profile = profileById.get(row.recipient_id)
      groups.set(key, { ...parseNotification(row), recipientCount: 1, revokedAt: row.revoked_at, recipients: [{ id: row.recipient_id, displayName: profile?.display_name ?? null, email: profile?.email ?? null, readAt: row.read_at }] })
    }
  }
  return [...groups.values()]
}

export async function revokeAdminNotification(id: number): Promise<void> {
  const { error } = await supabase.rpc("revoke_admin_notification", { p_notification_id: id })
  if (error) throw error
}

export async function markNotificationRead(id: number): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null)
  if (error) throw error
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
  if (error) throw error
}

export async function fetchNotificationRecipients(): Promise<NotificationRecipient[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .eq("role", "user")
    .eq("status", "active")
    .order("display_name", { ascending: true, nullsFirst: false })
    .limit(1000)
  if (error) throw error
  return data.map((row) => ({ id: row.id, email: row.email, displayName: row.display_name }))
}

export async function sendAdminNotification(input: { title: string; message: string; recipientId: string | null }): Promise<number> {
  const { data, error } = await supabase.rpc("send_admin_notification", {
    p_title: input.title,
    p_message: input.message,
    p_recipient_id: input.recipientId,
  })
  if (error) throw error
  return typeof data === "number" ? data : Number(data ?? 0)
}

export async function sendAdminNotifications(input: { title: string; message: string; recipientIds: string[] }): Promise<number> {
  if (input.recipientIds.length === 0) {
    return sendAdminNotification({ title: input.title, message: input.message, recipientId: null })
  }
  let sent = 0
  for (const recipientId of input.recipientIds) {
    sent += await sendAdminNotification({ title: input.title, message: input.message, recipientId })
  }
  return sent
}

export { parseNotification }
