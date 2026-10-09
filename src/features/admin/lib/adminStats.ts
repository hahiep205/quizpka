type AdminRole = "user" | "admin"
export type AdminStatus = "active" | "blocked"

export type AdminUser = {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  schoolOrFaculty: string | null
  cohort: string | null
  role: AdminRole
  status: AdminStatus
  blockedReason: string | null
  blockedAt: string | null
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

export type AdminSortKey = "lastActive" | "attempts" | "points" | "accuracy" | "displayName" | "createdAt"
