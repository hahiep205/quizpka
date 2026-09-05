import { supabase } from "@/lib/supabase"
import { parseAdminUsers, type AdminUser } from "@/features/admin/lib/adminStats"

export type FetchAdminResult =
  | { ok: true; users: AdminUser[]; hasMore: boolean }
  | { ok: false; error: string; users: AdminUser[]; hasMore: boolean }

/**
 * P0: chỉ đọc 2 bảng sẵn có (profiles + user_learning_stats).
 * Yêu cầu RLS cho phép role=admin select all (xem migration admin).
 * Nếu RLS chưa mở, Supabase trả về [] hoặc lỗi — UI sẽ hiển thị hướng dẫn.
 */
export async function fetchAdminUsers(page = 0, pageSize = 100): Promise<FetchAdminResult> {
  try {
    const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
    const from = Math.max(0, Math.floor(page)) * safePageSize
    const to = from + safePageSize - 1
    const [profilesRes, statsRes] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,avatar_url,role,status,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to),
      supabase.from("user_learning_stats").select("user_id,attempts,average_accuracy,total_duration_seconds,subjects_reviewed,points,week_attempts,week_average_accuracy,week_points,visible,updated_at", { count: "exact" }).range(from, to),
    ])
    if (profilesRes.error) {
      return { ok: false, users: [], hasMore: false, error: `Không đọc được bảng profiles: ${profilesRes.error.message}. Hãy chạy migration admin RLS.` }
    }
    if (statsRes.error) {
      // Vẫn trả profiles, stats coi như rỗng để admin thấy danh sách logined.
      const users = parseAdminUsers(profilesRes.data, [])
      return { ok: true, users, hasMore: (profilesRes.count ?? from + users.length) > from + users.length }
    }
    return { ok: true, users: parseAdminUsers(profilesRes.data, statsRes.data), hasMore: (profilesRes.count ?? from + profilesRes.data.length) > from + profilesRes.data.length }
  } catch (err) {
    return { ok: false, users: [], hasMore: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
