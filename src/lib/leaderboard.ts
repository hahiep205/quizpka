import { supabase } from "@/lib/supabase"
import {
  sortValueForStats,
  type LearningPeriod,
  type LearningStats,
} from "@/lib/learningStats"

type LeaderboardSortKey = "points" | "subjects" | "attempts" | "accuracy" | "time"

export const SCORE_WEIGHTS = { a: 0.55, c: 0.15, p: 0.15, t: 0.15 } as const
export const SCORE_SMOOTH_P0 = 0.6
export const SCORE_SMOOTH_M = 2
export const SCORE_P_NORM = 21
export const SCORE_T_MAX_MINUTES = 180
export const SCORE_Q_BASELINE = 0.6

export type ScoreBreakdown = { a: number; c: number; p: number; t: number; q: number }

export type ScoreInput = {
  /** Tổng accuracy thô (thang 0–100, ví dụ average_accuracy * attempts). */
  accSum: number
  attempts: number
  subjects: number
  totalSubjects: number
  /** Tổng thời gian học (giây). Đủ 20 giờ đạt max. */
  totalSeconds: number
}

/**
 * Công thức điểm BXH v2, mirror SQL trong migration leaderboard_score_v2
 * (refresh_user_verified_stats + backfill). Giữ 2 bản đồng bộ khi đổi số.
 * Score = 1000 × (0.55A + 0.15C + 0.15P + 0.15R), 0–1000.
 */
export function computeLeaderboardScore(input: ScoreInput): { score: number; breakdown: ScoreBreakdown } {
  const zero = { score: 0, breakdown: { a: 0, c: 0, p: 0, t: 0, q: 0 } }
  const attempts = Math.floor(input.attempts)
  if (!Number.isFinite(attempts) || attempts <= 0) return zero
  const a = (Math.max(0, input.accSum) / 100 + SCORE_SMOOTH_M * SCORE_SMOOTH_P0) / (attempts + SCORE_SMOOTH_M)
  const c = input.totalSubjects > 0 ? Math.min(1, Math.max(0, input.subjects) / input.totalSubjects) : 0
  const p = Math.min(1, Math.log(1 + attempts) / Math.log(SCORE_P_NORM))
  const t = Math.min(1, Math.max(0, input.totalSeconds) / 60 / SCORE_T_MAX_MINUTES)
  const q = Math.min(1, a / SCORE_Q_BASELINE)
  const score = Math.round(1000 * (SCORE_WEIGHTS.a * a + q * (SCORE_WEIGHTS.c * c + SCORE_WEIGHTS.p * p + SCORE_WEIGHTS.t * t)))
  return { score, breakdown: { a, c, p, t, q } }
}

export type LeaderboardEntry = {
  userId: string
  name: string
  avatarUrl: string | null
  visible: boolean
  isYou: boolean
  stats: LearningStats
  points: number
  /** Điểm v2 (null khi DB chưa migrate / đường fallback cũ không có cột). */
  score: number | null
  breakdown: ScoreBreakdown | null
  /** Hạng toàn bảng từ DB; null khi tài khoản đang ẩn khỏi bảng công khai. */
  rankPosition: number | null
}

export type RankedLeaderboardEntry = LeaderboardEntry & { rank: number }

type LearningStatsRow = {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  visible: boolean
  subjects_reviewed: number
  attempts: number
  average_accuracy: number
  total_duration_seconds: number
  points: number
  week_subjects_reviewed: number
  week_attempts: number
  week_average_accuracy: number
  week_total_duration_seconds: number
  week_points: number
  month_subjects_reviewed: number
  month_attempts: number
  month_average_accuracy: number
  month_total_duration_seconds: number
  month_points: number
  score: number | null
  score_a: number | null
  score_c: number | null
  score_p: number | null
  score_t: number | null
  rank_position: number | null
}

function asInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function asScore(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

function asFraction(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(1, n)
}

export function parseLearningStatsRows(rows: unknown): LearningStatsRow[] {
  if (!Array.isArray(rows)) return []
  const parsed: LearningStatsRow[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue
    const userId = "user_id" in row && typeof row.user_id === "string" ? row.user_id : ""
    if (!userId) continue
    parsed.push({
      user_id: userId,
      display_name: "display_name" in row && typeof row.display_name === "string" ? row.display_name : null,
      avatar_url: "avatar_url" in row && typeof row.avatar_url === "string" ? row.avatar_url : null,
      visible: !("visible" in row) || row.visible !== false,
      subjects_reviewed: asInt("subjects_reviewed" in row ? row.subjects_reviewed : 0),
      attempts: asInt("attempts" in row ? row.attempts : 0),
      average_accuracy: asInt("average_accuracy" in row ? row.average_accuracy : 0),
      total_duration_seconds: asInt("total_duration_seconds" in row ? row.total_duration_seconds : 0),
      points: asInt("points" in row ? row.points : 0),
      week_subjects_reviewed: asInt("week_subjects_reviewed" in row ? row.week_subjects_reviewed : 0),
      week_attempts: asInt("week_attempts" in row ? row.week_attempts : 0),
      week_average_accuracy: asInt("week_average_accuracy" in row ? row.week_average_accuracy : 0),
      week_total_duration_seconds: asInt("week_total_duration_seconds" in row ? row.week_total_duration_seconds : 0),
      week_points: asInt("week_points" in row ? row.week_points : 0),
      month_subjects_reviewed: asInt("month_subjects_reviewed" in row ? row.month_subjects_reviewed : 0),
      month_attempts: asInt("month_attempts" in row ? row.month_attempts : 0),
      month_average_accuracy: asInt("month_average_accuracy" in row ? row.month_average_accuracy : 0),
      month_total_duration_seconds: asInt("month_total_duration_seconds" in row ? row.month_total_duration_seconds : 0),
      month_points: asInt("month_points" in row ? row.month_points : 0),
      score: "score" in row ? asScore(row.score) : null,
      score_a: "score_a" in row ? asFraction(row.score_a) : null,
      score_c: "score_c" in row ? asFraction(row.score_c) : null,
      score_p: "score_p" in row ? asFraction(row.score_p) : null,
      score_t: "score_t" in row ? asFraction(row.score_t) : null,
      rank_position: "rank_position" in row ? asInt(row.rank_position) || null : null,
    })
  }
  return parsed
}

function statsForPeriod(row: LearningStatsRow, period: LearningPeriod): { stats: LearningStats; points: number } {
  if (period === "week") {
    return {
      stats: {
        subjectsReviewed: row.week_subjects_reviewed,
        attempts: row.week_attempts,
        averageAccuracy: row.week_average_accuracy,
        totalDurationSeconds: row.week_total_duration_seconds,
      },
      points: row.week_points,
    }
  }
  if (period === "month") {
    return {
      stats: {
        subjectsReviewed: row.month_subjects_reviewed,
        attempts: row.month_attempts,
        averageAccuracy: row.month_average_accuracy,
        totalDurationSeconds: row.month_total_duration_seconds,
      },
      points: row.month_points,
    }
  }
  return {
    stats: {
      subjectsReviewed: row.subjects_reviewed,
      attempts: row.attempts,
      averageAccuracy: row.average_accuracy,
      totalDurationSeconds: row.total_duration_seconds,
    },
    points: row.points,
  }
}

export function toLeaderboardEntry(row: LearningStatsRow, period: LearningPeriod, currentUserId?: string): LeaderboardEntry {
  const { stats, points } = statsForPeriod(row, period)
  const breakdown =
    row.score_a !== null || row.score_c !== null || row.score_p !== null || row.score_t !== null
      ? (() => {
          const a = row.score_a ?? 0
          return { a, c: row.score_c ?? 0, p: row.score_p ?? 0, t: row.score_t ?? 0, q: Math.min(1, a / SCORE_Q_BASELINE) }
        })()
      : null
  return {
    userId: row.user_id,
    name: row.display_name?.trim() || "Quizpka",
    avatarUrl: row.avatar_url,
    visible: row.visible,
    isYou: Boolean(currentUserId && row.user_id === currentUserId),
    stats,
    points,
    score: row.score,
    breakdown,
    rankPosition: row.rank_position,
  }
}

function rankValue(entry: LeaderboardEntry): number {
  return entry.score ?? entry.points
}

export function rankLeaderboard(entries: LeaderboardEntry[], sortKey: LeaderboardSortKey): RankedLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const delta = sortKey === "points"
      ? rankValue(b) - rankValue(a)
      : sortValueForStats(b.stats, b.points, sortKey) - sortValueForStats(a.stats, a.points, sortKey)
    if (delta !== 0) return delta
    if (rankValue(b) !== rankValue(a)) return rankValue(b) - rankValue(a)
    return sortKey === "points" ? a.userId.localeCompare(b.userId) : a.name.localeCompare(b.name)
  })
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }))
}

const LEADERBOARD_REFRESH_MS = 30 * 60_000

export type LeaderboardSnapshot = {
  entries: LeaderboardEntry[]
  computedAt: string | null
  fetchedAt: number
}

export type PersonalLeaderboardScore = {
  score: number
  points: number
  visible: boolean
  fetchedAt: number
}

type SnapshotPayload = { rows: LearningStatsRow[]; computedAt: string | null; fetchedAt: number }
let snapshotCache: { at: number; payload: SnapshotPayload } | null = null
let snapshotInflight: Promise<SnapshotPayload | null> | null = null
let snapshotVersion = 0
const personalScoreCache = new Map<string, { at: number; value: PersonalLeaderboardScore }>()
const personalScoreInflight = new Map<string, Promise<PersonalLeaderboardScore | null>>()
const personalScoreVersions = new Map<string, number>()

export function invalidateLeaderboardSnapshotCache(userId?: string) {
  snapshotVersion += 1
  snapshotCache = null
  snapshotInflight = null
  if (userId) {
    personalScoreCache.delete(userId)
    personalScoreInflight.delete(userId)
    personalScoreVersions.set(userId, (personalScoreVersions.get(userId) ?? 0) + 1)
  }
}

async function loadSnapshot(force = false): Promise<SnapshotPayload | null> {
  if (!force && snapshotCache && Date.now() - snapshotCache.at < LEADERBOARD_REFRESH_MS) {
    return snapshotCache.payload
  }
  if (snapshotInflight) return snapshotInflight

  const version = snapshotVersion
  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-leaderboard", { body: {} })
      if (error || !data || typeof data !== "object") return null
      // Accept the previous Edge response briefly during a rolling deployment.
      if (Array.isArray(data)) {
        const payload: SnapshotPayload = { rows: parseLearningStatsRows(data), computedAt: null, fetchedAt: Date.now() }
        if (snapshotVersion === version) snapshotCache = { at: Date.now(), payload }
        return payload
      }
      if (!("entries" in data) || !Array.isArray(data.entries)) return null
      const payload: SnapshotPayload = {
        rows: parseLearningStatsRows(data.entries),
        computedAt: typeof data.computed_at === "string" ? data.computed_at : null,
        fetchedAt: Date.now(),
      }
      if (snapshotVersion === version) snapshotCache = { at: Date.now(), payload }
      return payload
    } catch {
      return null
    }
  })()
  snapshotInflight = promise
  void promise.then(() => {
    if (snapshotInflight === promise) snapshotInflight = null
  }, () => {
    if (snapshotInflight === promise) snapshotInflight = null
  })
  return promise
}

export async function fetchLeaderboardSnapshot(
  period: LearningPeriod,
  currentUserId?: string,
  options?: { force?: boolean },
): Promise<LeaderboardSnapshot | null> {
  const payload = await loadSnapshot(options?.force)
  if (!payload) return null
  return {
    entries: payload.rows
      .filter((row) => row.visible)
      .map((row) => toLeaderboardEntry(row, period, currentUserId)),
    computedAt: payload.computedAt,
    fetchedAt: payload.fetchedAt,
  }
}

export async function fetchMyLeaderboardScore(
  userId: string,
  options?: { force?: boolean },
): Promise<PersonalLeaderboardScore | null> {
  const cached = personalScoreCache.get(userId)
  if (!options?.force && cached && Date.now() - cached.at < LEADERBOARD_REFRESH_MS) return cached.value
  const running = personalScoreInflight.get(userId)
  if (running) return running

  const version = personalScoreVersions.get(userId) ?? 0
  const promise = (async () => {
    try {
      const { data, error } = await supabase.rpc("get_my_leaderboard_score_snapshot")
      if (error || !data || typeof data !== "object") return null
      const row = data as Record<string, unknown>
      const value: PersonalLeaderboardScore = {
        score: asScore(row.score) ?? 0,
        points: asInt(row.points),
        visible: row.visible !== false,
        fetchedAt: Date.now(),
      }
      if ((personalScoreVersions.get(userId) ?? 0) === version) personalScoreCache.set(userId, { at: Date.now(), value })
      return value
    } catch {
      return null
    }
  })()
  personalScoreInflight.set(userId, promise)
  void promise.then(() => {
    if (personalScoreInflight.get(userId) === promise) personalScoreInflight.delete(userId)
  }, () => {
    if (personalScoreInflight.get(userId) === promise) personalScoreInflight.delete(userId)
  })
  return promise
}

export async function fetchLeaderboardV2(
  period: LearningPeriod,
  currentUserId?: string,
  options?: { limit?: number; force?: boolean },
): Promise<LeaderboardEntry[]> {
  return (await fetchLeaderboardSnapshot(period, currentUserId, options))?.entries ?? []
}

export async function fetchLeaderboard(
  period: LearningPeriod,
  currentUserId?: string,
  options?: { limit?: number; force?: boolean },
): Promise<LeaderboardEntry[]> {
  return fetchLeaderboardV2(period, currentUserId, options)
}
