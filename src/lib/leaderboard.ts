import { supabase } from "@/lib/supabase"
import {
  sortValueForStats,
  type LearningPeriod,
  type LearningStats,
} from "@/lib/learningStats"

type LeaderboardSortKey = "points" | "subjects" | "attempts" | "accuracy" | "time"

export type LeaderboardEntry = {
  userId: string
  name: string
  avatarUrl: string | null
  visible: boolean
  isYou: boolean
  stats: LearningStats
  points: number
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
}

function asInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
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
  return {
    userId: row.user_id,
    name: row.display_name?.trim() || "Quizpka",
    avatarUrl: row.avatar_url,
    visible: row.visible,
    isYou: Boolean(currentUserId && row.user_id === currentUserId),
    stats,
    points,
  }
}

export function rankLeaderboard(entries: LeaderboardEntry[], sortKey: LeaderboardSortKey): RankedLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const delta = sortValueForStats(b.stats, b.points, sortKey) - sortValueForStats(a.stats, a.points, sortKey)
    if (delta !== 0) return delta
    if (b.points !== a.points) return b.points - a.points
    return a.name.localeCompare(b.name)
  })
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }))
}

const LEADERBOARD_SELECT =
  "user_id, display_name, avatar_url, visible, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points, week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points, month_subjects_reviewed, month_attempts, month_average_accuracy, month_total_duration_seconds, month_points"
const LEADERBOARD_SELECT_LEGACY =
  "user_id, display_name, avatar_url, visible, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points, week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points"

/** Server-side cap: UI chỉ hiển thị top 10, RPC giới hạn tối đa 200. */
const LEADERBOARD_LIMIT_DEFAULT = 100
const LEADERBOARD_LIMIT_MAX = 200

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
