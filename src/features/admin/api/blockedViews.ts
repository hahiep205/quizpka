import { supabase } from "@/lib/supabase"

const SESSION_KEY_PREFIX = "quizpka-blocked-view:"

function alreadyLoggedThisSession(userId: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY_PREFIX + userId) !== null
  } catch {
    return false
  }
}

function markLoggedThisSession(userId: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + userId, String(Date.now()))
  } catch {
    // best-effort
  }
}

/**
 * Ghi nhận 1 lượt "user bị chặn đã mở app / nhìn thấy lý do khóa".
 * Best-effort, không throw, mỗi tab chỉ ghi 1 lần để chống spam.
 * RLS: blocked user được insert chính dòng của mình.
 */
export function logBlockedAccountView(userId: string | undefined): void {
  if (!userId) return
  if (alreadyLoggedThisSession(userId)) return
  markLoggedThisSession(userId)
  void (async () => {
    try {
      await supabase.from("blocked_account_views").insert({ user_id: userId })
    } catch {
      // bỏ qua, không vỡ UX của màn hình khóa
    }
  })()
}

type BlockedViewStat = { userId: string; viewCount: number; lastViewedAt: string | null }

/** Admin đọc thống kê lượt xem lý do khóa của 1 user. */
export async function fetchBlockedViewStat(userId: string): Promise<BlockedViewStat> {
  const { data, error } = await supabase
    .from("blocked_account_views")
    .select("created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ created_at?: string | null }>
  // count trả về tổng số dòng khớp filter (không bị limit cắt).
  const { count } = await supabase
    .from("blocked_account_views")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  return {
    userId,
    viewCount: count ?? rows.length,
    lastViewedAt: typeof rows[0]?.created_at === "string" ? rows[0].created_at : null,
  }
}
