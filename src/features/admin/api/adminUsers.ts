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

export type AdminCreatedTodayUser = Pick<AdminUser, "id" | "email" | "displayName" | "avatarUrl" | "role" | "status" | "createdAt">

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
    schoolOrFaculty: null,
    cohort: null,
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
    if (users.length) {
      const { data: profileDetails } = await supabase
        .from("profiles")
        .select("id,school_or_faculty,cohort")
        .in("id", users.map((user) => user.id))
      const detailsById = new Map((profileDetails ?? []).map((profile) => [profile.id, profile]))
      for (const user of users) {
        const details = detailsById.get(user.id)
        user.schoolOrFaculty = details?.school_or_faculty ?? null
        user.cohort = details?.cohort ?? null
      }
    }
    return { ok: true, error: null, users, total: Number(result.total ?? users.length), kpis: parseKpis(result.kpis) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error", users: [], total: 0, kpis: null }
  }
}

/** Fetches all profiles created during the current Vietnam calendar day. */
export async function fetchAdminUsersCreatedToday(): Promise<AdminCreatedTodayUser[]> {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const part = (type: "year" | "month" | "day") => dateParts.find((item) => item.type === type)?.value ?? ""
  const [year, month, day] = [part("year"), part("month"), part("day")].map(Number)
  const start = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000).toISOString()
  const end = new Date(Date.UTC(year, month - 1, day + 1) - 7 * 60 * 60 * 1000).toISOString()
  const pageSize = 500
  const rows: AdminCreatedTodayUser[] = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,display_name,avatar_url,role,status,created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(error.message)

    const page = (data ?? []).map((row) => ({
      id: row.id,
      email: row.email ?? null,
      displayName: row.display_name ?? null,
      avatarUrl: row.avatar_url ?? null,
      role: row.role === "admin" ? "admin" as const : "user" as const,
      status: row.status === "blocked" ? "blocked" as const : "active" as const,
      createdAt: row.created_at ?? null,
    }))
    rows.push(...page)
    if (page.length < pageSize) return rows
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
