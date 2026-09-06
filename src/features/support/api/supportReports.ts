import { supabase } from "@/lib/supabase"

export type SupportStatus = "pending" | "resolved" | "unresolvable"
export type SupportType = "report" | "contribute" | "feedback"
export type SupportReport = { id: string; userId: string; displayName: string | null; email: string | null; type: SupportType; subject: string; description: string; pageUrl: string | null; status: SupportStatus; createdAt: string; updatedAt: string }

export async function submitSupportReport(input: { type: SupportType; subject: string; description: string; pageUrl: string }): Promise<void> {
  const { error } = await supabase.rpc("submit_support_report", { p_type: input.type, p_subject: input.subject, p_description: input.description, p_page_url: input.pageUrl })
  if (error) throw new Error(`Không thể gửi báo lỗi: ${error.message}`)
}

export async function fetchSupportReports(): Promise<SupportReport[]> {
  const { data, error } = await supabase.from("support_reports").select("id,user_id,type,subject,description,page_url,status,created_at,updated_at").order("created_at", { ascending: false }).limit(1000)
  if (error) throw new Error(`Không đọc được danh sách báo lỗi: ${error.message}`)
  const userIds = [...new Set((data ?? []).map((row) => row.user_id))]
  const profiles = userIds.length ? await supabase.from("profiles").select("id,display_name,email").in("id", userIds) : { data: [], error: null }
  if (profiles.error) throw new Error(`Không đọc được thông tin user: ${profiles.error.message}`)
  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]))
  return (data ?? []).map((row) => { const profile = profileById.get(row.user_id); return { id: row.id, userId: row.user_id, displayName: profile?.display_name ?? null, email: profile?.email ?? null, type: row.type, subject: row.subject, description: row.description, pageUrl: row.page_url, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at } })
}

export async function updateSupportStatus(id: string, status: SupportStatus): Promise<void> {
  const { error } = await supabase.rpc("admin_update_support_status", { p_report_id: id, p_status: status })
  if (error) throw new Error(`Không thể cập nhật trạng thái: ${error.message}`)
}
