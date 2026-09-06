import { supabase } from "@/lib/supabase"

export type UserNotification = {
  id: number
  title: string
  message: string
  readAt: string | null
  createdAt: string
  isDirect: boolean
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
    .select("id,title,message,read_at,created_at,is_direct")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as NotificationRow[]).map(parseNotification)
}

export async function fetchUnreadDirectNotification(): Promise<UserNotification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,read_at,created_at,is_direct")
    .eq("is_direct", true)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? parseNotification(data as NotificationRow) : null
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
