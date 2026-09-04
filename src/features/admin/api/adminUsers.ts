import { supabase } from "@/lib/supabase"
import { parseAdminUsers, type AdminUser } from "@/features/admin/lib/adminStats"

export type FetchAdminResult =
  | { ok: true; users: AdminUser[] }
  | { ok: false; error: string; users: AdminUser[] }

/**
 * P0: chỉ đọc 2 bảng sẵn có (profiles + user_learning_stats).
 * Yêu cầu RLS cho phép role=admin select all (xem migration admin).
 * Nếu RLS chưa mở, Supabase trả về [] hoặc lỗi — UI sẽ hiển thị hướng dẫn.
 */
export async function fetchAdminUsers(): Promise<FetchAdminResult> {
  try {
    const [profilesRes, statsRes] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,avatar_url,role,status,created_at").order("created_at", { ascending: false }).limit(2000),
      supabase.from("user_learning_stats").select("user_id,attempts,average_accuracy,total_duration_seconds,subjects_reviewed,points,week_attempts,week_average_accuracy,week_points,visible,updated_at").limit(5000),
    ])
    if (profilesRes.error) {
      return { ok: false, users: [], error: `Không đọc được bảng profiles: ${profilesRes.error.message}. Hãy chạy migration admin RLS.` }
    }
    if (statsRes.error) {
      // Vẫn trả profiles, stats coi như rỗng để admin thấy danh sách logined.
      const users = parseAdminUsers(profilesRes.data, [])
      return { ok: true, users }
    }
    return { ok: true, users: parseAdminUsers(profilesRes.data, statsRes.data) }
  } catch (err) {
    return { ok: false, users: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}
