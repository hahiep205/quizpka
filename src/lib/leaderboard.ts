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
    return a.name.localeCompare(b.name)
  })
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }))
}

const LEADERBOARD_SELECT =
  "user_id, display_name, avatar_url, visible, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points, week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points, month_subjects_reviewed, month_attempts, month_average_accuracy, month_total_duration_seconds, month_points"
const LEADERBOARD_SELECT_LEGACY =
  "user_id, display_name, avatar_url, visible, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points, week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points"

const LEADERBOARD_SELECT_V2 = `${LEADERBOARD_SELECT},score,score_a,score_c,score_p,score_t`

/** Server-side cap: UI chỉ hiển thị top 10, RPC giới hạn tối đa 10. */
const LEADERBOARD_LIMIT_DEFAULT = 10
const LEADERBOARD_LIMIT_MAX = 10

/** BXH điểm v2: ưu tiên RPC get_leaderboard_score_top, rồi SELECT trực tiếp
 * cột score, cuối cùng rớt về đường legacy (điểm points cũ, không breakdown). */
let v2MissingUntil = 0
const V2_MISSING_TTL_MS = 5 * 60_000

export async function fetchLeaderboardV2(
  period: LearningPeriod,
  currentUserId?: string,
  options?: { limit?: number },
): Promise<LeaderboardEntry[]> {
  const limit = clampLeaderboardLimit(options?.limit)
  const toEntries = (rows: LearningStatsRow[]) =>
    rows
      .filter((row) => {
        const visible = row.visible
        return visible || row.user_id === currentUserId
      })
      .map((row) => toLeaderboardEntry(row, period, currentUserId))
  // Migration score v2 chưa chạy (RPC 404 gần đây) -> đi thẳng legacy,
  // khỏi tốn thêm request lỗi. Muộn nhất 5 phút sau sẽ thử lại RPC.
  if (Date.now() < v2MissingUntil) {
    return fetchLeaderboard(period, currentUserId, options)
  }
  try {
    const { data, error } = await supabase.rpc("get_leaderboard_score_top", { p_limit: limit })
    if (!error && Array.isArray(data)) {
      const entries = toEntries(parseLearningStatsRows(data))
      if (entries.length > 0) return entries
    } else if (error) {
      if (/too many requests/i.test(error.message ?? "")) return []
      // PGRST202 = function chưa tồn tại (migration score v2 chưa chạy) ->
      // cột score chắc chắn cũng chưa có, bỏ qua SELECT trực tiếp để đỡ
      // 1 request 400 vô ích, rớt thẳng về đường legacy.
      if ((error as { code?: string }).code === "PGRST202") {
        v2MissingUntil = Date.now() + V2_MISSING_TTL_MS
        return fetchLeaderboard(period, currentUserId, options)
      }
    }
  } catch {
    // Rớt xuống các đường bên dưới.
  }
  try {
    const { data, error } = await supabase
      .from("user_learning_stats")
      .select(LEADERBOARD_SELECT_V2)
      .eq("visible", true)
      .order("score", { ascending: false })
      .limit(limit)
    if (!error && Array.isArray(data)) {
      const entries = toEntries(parseLearningStatsRows(data))
      if (entries.length > 0) return entries
    }
  } catch {
    // DB chưa migrate (thiếu cột score) -> rớt về legacy.
  }
  return fetchLeaderboard(period, currentUserId, options)
}

function clampLeaderboardLimit(limit?: number): number {
  if (!Number.isFinite(limit as number)) return LEADERBOARD_LIMIT_DEFAULT
  return Math.min(Math.max(Math.floor(limit as number), 1), LEADERBOARD_LIMIT_MAX)
}

function dedupeRows(rows: LearningStatsRow[]): LearningStatsRow[] {
  const byId = new Map<string, LearningStatsRow>()
  for (const row of rows) {
    if (!byId.has(row.user_id)) byId.set(row.user_id, row)
  }
  return [...byId.values()]
}

export async function fetchLeaderboard(
  period: LearningPeriod,
  currentUserId?: string,
  options?: { limit?: number },
): Promise<LeaderboardEntry[]> {
  const limit = clampLeaderboardLimit(options?.limit)
  try {
    // P2: đường chính — Edge Function get-leaderboard (cache isolate 60s +
    // rate-limit IP/user + Cache-Control public, max-age=60 kèm Vary:
    // Authorization). Client không còn chạm PostgREST trực tiếp ở đường happy-path.
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("get-leaderboard", {
        body: { limit },
      })
      if (!fnError && Array.isArray(fnData)) {
        const rows = parseLearningStatsRows(fnData).filter(
          (row) => row.visible || row.user_id === currentUserId,
        )
        if (rows.length > 0) return rows.map((row) => toLeaderboardEntry(row, period, currentUserId))
      } else if (fnError && /too many requests/i.test(fnError.message ?? "")) {
        // Bị rate-limit ở edge: dừng luôn, không rớt xuống các đường rẻ hơn.
        return []
      }
      // Function chưa deploy / lỗi thoáng qua: rớt xuống RPC rồi direct.
    } catch {
      // Lỗi mạng invoke: rớt xuống các đường fallback bên dưới.
    }

    // P1: đường dự phòng — RPC server-side đã ORDER BY + LIMIT + rate-limit.
    // Một request dù bị lộ JWT cũng chỉ tốn 1 RPC nhỏ, không full-scan.
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_leaderboard_top", {
      p_limit: limit,
    })
    if (!rpcError && Array.isArray(rpcData)) {
      const rows = parseLearningStatsRows(rpcData).filter(
        (row) => row.visible || row.user_id === currentUserId,
      )
      // RPC đã trả cả dòng của chính mình (kể cả khi ẩn) để tính hạng "you".
      if (rows.length > 0) return rows.map((row) => toLeaderboardEntry(row, period, currentUserId))
      // RPC trống (bảng legacy / chưa migrate): rớt xuống fallback bên dưới.
    }
    // Bị rate-limit thì dừng luôn — không fallback sang SELECT trực tiếp,
    // nếu không rào 30 req/phút sẽ bị bypass bởi chính client này.
    if (rpcError && /too many requests/i.test((rpcError as { message?: string }).message ?? "")) {
      return []
    }

    // P1 fallback: 2 query nhỏ có giới hạn thay vì 1 full-scan.
    // 1) top visible đã sắp xếp server-side, 2) dòng của chính mình.
    const publicQuery = supabase
      .from("user_learning_stats")
      .select(LEADERBOARD_SELECT)
      .eq("visible", true)
      .order("points", { ascending: false })
      .limit(limit)
    const ownQuery = currentUserId
      ? supabase.from("user_learning_stats").select(LEADERBOARD_SELECT).eq("user_id", currentUserId).maybeSingle()
      : null
    const [pubRes, ownRes] = await Promise.all([
      publicQuery,
      ownQuery ?? Promise.resolve({ data: null, error: null } as never),
    ])
    let rows = parseLearningStatsRows((pubRes as { data: unknown }).data)
    if ((pubRes as { error: unknown }).error) {
      // Cột month_* chưa có (DB cũ): thử select legacy.
      const legacy = await supabase
        .from("user_learning_stats")
        .select(LEADERBOARD_SELECT_LEGACY)
        .eq("visible", true)
        .order("points", { ascending: false })
        .limit(limit)
      if (legacy.error) return []
      rows = parseLearningStatsRows(legacy.data)
    }
    const ownRow = ownRes && "data" in (ownRes as object)
      ? parseLearningStatsRows((ownRes as { data: unknown }).data ? [(ownRes as { data: unknown }).data] : [])
      : []
    return dedupeRows([...ownRow, ...rows])
      .filter((row) => row.visible || row.user_id === currentUserId)
      .map((row) => toLeaderboardEntry(row, period, currentUserId))
  } catch {
    return []
  }
}
