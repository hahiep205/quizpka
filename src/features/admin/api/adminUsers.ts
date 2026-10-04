import { supabase } from "@/lib/supabase"
import type { AdminKpis, AdminStatus, AdminUser } from "@/features/admin/lib/adminStats"

export type FetchAdminUsersPageOptions = {
  query?: string
  role?: "all" | "user" | "admin"
  status?: "all" | "active" | "blocked"
  userIds?: string[] | null
  sort?: "createdAt" | "lastActive" | "attempts" | "points" | "accuracy" | "displayName"
  desc?: boolean
  offset?: number
  limit?: number
}

type FetchAdminUsersPageResult = {
  ok: boolean
  error: string | null
  users: AdminUser[]
  total: number
  kpis: AdminKpis | null
}

type AdminUserRow = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: string
  status: string
  blocked_reason: string | null
  blocked_at: string | null
  created_at: string | null
  attempts: number
  average_accuracy: number
  total_duration_seconds: number
  subjects_reviewed: number
  points: number
  week_attempts: number
  week_average_accuracy: number
  week_points: number
  visible: boolean
  updated_at: string | null
}

type AdminKpisRow = Record<string, number>

const EMPTY_KPIS: AdminKpis = {
  totalLogined: 0,
  activeAccount: 0,
  blockedAccount: 0,
  active7d: 0,
  active30d: 0,
  totalAttempts: 0,
  avgAccuracy: 0,
  totalDurationSeconds: 0,
  new7d: 0,
  newToday: 0,
}

function parseAdminUserRow(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    role: row.role === "admin" ? "admin" : "user",
    status: row.status === "blocked" ? "blocked" : "active",
    blockedReason: row.blocked_reason ?? null,
    blockedAt: row.blocked_at ?? null,
    createdAt: row.created_at ?? null,
    attempts: Number(row.attempts) || 0,
    averageAccuracy: Number(row.average_accuracy) || 0,
    totalDurationSeconds: Number(row.total_duration_seconds) || 0,
    subjectsReviewed: Number(row.subjects_reviewed) || 0,
    points: Number(row.points) || 0,
    weekAttempts: Number(row.week_attempts) || 0,
    weekAverageAccuracy: Number(row.week_average_accuracy) || 0,
    weekPoints: Number(row.week_points) || 0,
    leaderboardVisible: row.visible !== false,
    lastActiveAt: row.updated_at ?? null,
  }
}

function parseKpis(raw: AdminKpisRow | null | undefined): AdminKpis {
  const kpis: AdminKpis = { ...EMPTY_KPIS }
  if (!raw) return kpis
  kpis.totalLogined = Number(raw.total_logined) || 0
  kpis.activeAccount = Number(raw.active_account) || 0
  kpis.blockedAccount = Number(raw.blocked_account) || 0
  kpis.active7d = Number(raw.active_7d) || 0
  kpis.active30d = Number(raw.active_30d) || 0
  kpis.totalAttempts = Number(raw.total_attempts) || 0
  kpis.avgAccuracy = Number(raw.avg_accuracy) || 0
  kpis.totalDurationSeconds = Number(raw.total_duration_seconds) || 0
  kpis.new7d = Number(raw.new_7d) || 0
  kpis.newToday = Number(raw.new_today) || 0
  return kpis
}

const SORT_KEYS: Record<NonNullable<FetchAdminUsersPageOptions["sort"]>, string> = {
  createdAt: "created_at",
  lastActive: "last_active",
  attempts: "attempts",
  points: "points",
  accuracy: "accuracy",
  displayName: "display_name",
}

/**
 * P-log-cost: 1 request thay cho fan-out 4 request/trang (profiles dump +
 * 2 count HEAD + user_learning_stats dump gây 416 khi offset vượt số dòng).
 * Search/filter/sort/paging chạy server-side qua public.admin_list_users.
 */
export async function fetchAdminUsersPage(options: FetchAdminUsersPageOptions = {}): Promise<FetchAdminUsersPageResult> {
  try {
    const { data, error } = await supabase.rpc("admin_list_users", {
      p_query: options.query ?? "",
      p_role: options.role ?? "all",
      p_status: options.status ?? "all",
      p_engagement_days: null,
      p_user_ids: options.userIds ?? null,
      p_sort: SORT_KEYS[options.sort ?? "createdAt"],
      p_desc: options.desc ?? true,
      p_offset: options.offset ?? 0,
      p_limit: options.limit ?? 15,
    })
    if (error) return { ok: false, error: error.message, users: [], total: 0, kpis: null }
    const result = (data ?? {}) as { items?: AdminUserRow[]; total?: number; kpis?: AdminKpisRow }
    const users = (result.items ?? []).map(parseAdminUserRow)
    return { ok: true, error: null, users, total: Number(result.total ?? users.length), kpis: parseKpis(result.kpis) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error", users: [], total: 0, kpis: null }
  }
}

type SetUserStatusResult = { status: AdminStatus; blockedReason: string | null; blockedAt: string | null }

/** Khóa / mở khóa tài khoản kèm lý do. Lý do bắt buộc khi khóa, hiển thị cho user lúc login. */
export async function setAdminUserStatus(userId: string, status: AdminStatus, reason?: string): Promise<SetUserStatusResult> {
  const { data, error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: status === "blocked" ? (reason ?? "") : null,
  })
  if (error) throw new Error(error.message)
  const row = data as { status?: string; blocked_reason?: string | null; blocked_at?: string | null } | null
  return {
    status: row?.status === "blocked" ? "blocked" : "active",
    blockedReason: typeof row?.blocked_reason === "string" && row.blocked_reason.length > 0 ? row.blocked_reason : null,
    blockedAt: typeof row?.blocked_at === "string" && row.blocked_at.length > 0 ? row.blocked_at : null,
  }
}
