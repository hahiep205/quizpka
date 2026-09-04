export type AdminRole = "user" | "admin"
export type AdminStatus = "active" | "blocked"

export type AdminUser = {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  role: AdminRole
  status: AdminStatus
  createdAt: string | null
  attempts: number
  averageAccuracy: number
  totalDurationSeconds: number
  subjectsReviewed: number
  points: number
  weekAttempts: number
  weekAverageAccuracy: number
  weekPoints: number
  leaderboardVisible: boolean
  lastActiveAt: string | null
}

export type AdminKpis = {
  totalLogined: number
  activeAccount: number
  blockedAccount: number
  active7d: number
  active30d: number
  totalAttempts: number
  avgAccuracy: number
  totalDurationSeconds: number
  new7d: number
  newToday: number
}

export const ACTIVE_7D_MS = 7 * 24 * 60 * 60 * 1000
export const ACTIVE_30D_MS = 30 * 24 * 60 * 60 * 1000

function asInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

type RecordLike = Record<string, unknown>

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Join profiles rows + user_learning_stats rows thành 1 danh sách duy nhất. */
export function parseAdminUsers(profilesRows: unknown, statsRows: unknown): AdminUser[] {
  const statsById = new Map<string, RecordLike>()
  if (Array.isArray(statsRows)) {
    for (const row of statsRows) {
      if (!isRecord(row)) continue
      const id = typeof row.user_id === "string" ? row.user_id : ""
      if (id) statsById.set(id, row)
    }
  }
  if (!Array.isArray(profilesRows)) return []
  const users: AdminUser[] = []
  for (const row of profilesRows) {
    if (!isRecord(row)) continue
    const id = typeof row.id === "string" ? row.id : ""
    if (!id) continue
    const stats = statsById.get(id)
    users.push({
      id,
      email: asStringOrNull(row.email),
      displayName: asStringOrNull(row.display_name),
      avatarUrl: asStringOrNull(row.avatar_url),
      role: row.role === "admin" ? "admin" : "user",
      status: row.status === "blocked" ? "blocked" : "active",
      createdAt: asStringOrNull(row.created_at),
      attempts: asInt(stats?.attempts),
      averageAccuracy: asInt(stats?.average_accuracy),
      totalDurationSeconds: asInt(stats?.total_duration_seconds),
      subjectsReviewed: asInt(stats?.subjects_reviewed),
      points: asInt(stats?.points),
      weekAttempts: asInt(stats?.week_attempts),
      weekAverageAccuracy: asInt(stats?.week_average_accuracy),
      weekPoints: asInt(stats?.week_points),
      leaderboardVisible: stats ? stats.visible !== false : true,
      lastActiveAt: asStringOrNull(stats?.updated_at),
    })
  }
  return users
}

export function isEngagementActive(user: AdminUser, windowMs: number, now = Date.now()): boolean {
  if (user.status !== "active") return false
  if (user.attempts <= 0 && user.weekAttempts <= 0) return false
  if (!user.lastActiveAt) return false
  const t = Date.parse(user.lastActiveAt)
  if (!Number.isFinite(t)) return false
  return now - t <= windowMs
}

export type AdminTab = "logined" | "active-account" | "active-7d" | "active-30d"

export function filterByTab(users: AdminUser[], tab: AdminTab, now = Date.now()): AdminUser[] {
  if (tab === "active-account") return users.filter((u) => u.status === "active")
  if (tab === "active-7d") return users.filter((u) => u.status === "active" && isEngagementActive(u, ACTIVE_7D_MS, now))
  if (tab === "active-30d") return users.filter((u) => u.status === "active" && isEngagementActive(u, ACTIVE_30D_MS, now))
  return users
}

export function filterAdminUsers(
  users: AdminUser[],
  options: { query?: string; role?: "all" | AdminRole; status?: "all" | AdminStatus },
): AdminUser[] {
  const q = (options.query ?? "").trim().toLowerCase()
  return users.filter((u) => {
    if (options.role && options.role !== "all" && u.role !== options.role) return false
    if (options.status && options.status !== "all" && u.status !== options.status) return false
    if (!q) return true
    const hay = `${u.displayName ?? ""} ${u.email ?? ""} ${u.id}`.toLowerCase()
    return hay.includes(q)
  })
}

export type AdminSortKey = "lastActive" | "attempts" | "points" | "accuracy" | "displayName" | "createdAt"

export function sortAdminUsers(users: AdminUser[], key: AdminSortKey, dir: "asc" | "desc"): AdminUser[] {
  const mul = dir === "asc" ? 1 : -1
  const ts = (v: string | null) => {
    if (!v) return 0
    const t = Date.parse(v)
    return Number.isFinite(t) ? t : 0
  }
  return [...users].sort((a, b) => {
    switch (key) {
      case "attempts": return (a.attempts - b.attempts) * mul
      case "points": return (a.points - b.points) * mul
      case "accuracy": return (a.averageAccuracy - b.averageAccuracy) * mul
      case "displayName": return (a.displayName ?? a.email ?? a.id).localeCompare(b.displayName ?? b.email ?? b.id) * mul
      case "createdAt": return (ts(a.createdAt) - ts(b.createdAt)) * mul
      case "lastActive":
      default: return (ts(a.lastActiveAt) - ts(b.lastActiveAt)) * mul
    }
  })
}

export function computeAdminKpis(users: AdminUser[], now = Date.now()): AdminKpis {
  let accuracySum = 0
  let accuracyCount = 0
  let totalAttempts = 0
  let totalDuration = 0
  let new7d = 0
  let newToday = 0
  const todayKey = new Date(now).toISOString().slice(0, 10)
  for (const u of users) {
    totalAttempts += u.attempts
    totalDuration += u.totalDurationSeconds
    if (u.attempts > 0) {
      accuracySum += u.averageAccuracy
      accuracyCount += 1
    }
    if (u.createdAt) {
      const t = Date.parse(u.createdAt)
      if (Number.isFinite(t) && now - t <= ACTIVE_7D_MS) new7d += 1
      if (Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === todayKey) newToday += 1
    }
  }
  return {
    totalLogined: users.length,
    activeAccount: users.filter((u) => u.status === "active").length,
    blockedAccount: users.filter((u) => u.status === "blocked").length,
    active7d: users.filter((u) => u.status === "active" && isEngagementActive(u, ACTIVE_7D_MS, now)).length,
    active30d: users.filter((u) => u.status === "active" && isEngagementActive(u, ACTIVE_30D_MS, now)).length,
    totalAttempts,
    avgAccuracy: accuracyCount ? Math.round(accuracySum / accuracyCount) : 0,
    totalDurationSeconds: totalDuration,
    new7d,
    newToday,
  }
}

function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toAdminCsv(users: AdminUser[]): string {
  const header = ["id", "email", "display_name", "role", "status", "created_at", "last_active_at", "attempts", "week_attempts", "avg_accuracy", "points", "week_points", "subjects_reviewed", "total_duration_seconds", "leaderboard_visible"]
  const lines = [header.join(",")]
  for (const u of users) {
    lines.push([
      csvCell(u.id), csvCell(u.email), csvCell(u.displayName), csvCell(u.role), csvCell(u.status),
      csvCell(u.createdAt), csvCell(u.lastActiveAt), csvCell(u.attempts), csvCell(u.weekAttempts),
      csvCell(u.averageAccuracy), csvCell(u.points), csvCell(u.weekPoints),
      csvCell(u.subjectsReviewed), csvCell(u.totalDurationSeconds), csvCell(u.leaderboardVisible ? "true" : "false"),
    ].join(","))
  }
  return lines.join("\n")
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
