import { supabase } from "@/lib/supabase"
import {
  computeLearningPoints,
  computeLearningStats,
  sortValueForStats,
  type LearningPeriod,
  type LearningStats,
} from "@/lib/learningStats"
import type { PracticeHistoryItem } from "@/lib/practiceSession"

export type LeaderboardSortKey = "points" | "subjects" | "attempts" | "accuracy" | "time"

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
    name: row.display_name?.trim() || "QuizPKA",
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

export function buildLocalLeaderboardEntry(input: {
  userId: string
  name: string
  avatarUrl: string | null
  visible: boolean
  history: PracticeHistoryItem[]
  period: LearningPeriod
}): LeaderboardEntry {
  const stats = computeLearningStats(input.history, input.period)
  return {
    userId: input.userId,
    name: input.name,
    avatarUrl: input.avatarUrl,
    visible: input.visible,
    isYou: true,
    stats,
    points: computeLearningPoints(stats),
  }
}

const LEADERBOARD_SELECT =
  "user_id, display_name, avatar_url, visible, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points, week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points, month_subjects_reviewed, month_attempts, month_average_accuracy, month_total_duration_seconds, month_points"
const LEADERBOARD_SELECT_LEGACY =
  "user_id, display_name, avatar_url, visible, subjects_reviewed, attempts, average_accuracy, total_duration_seconds, points, week_subjects_reviewed, week_attempts, week_average_accuracy, week_total_duration_seconds, week_points"

export async function fetchLeaderboard(period: LearningPeriod, currentUserId?: string): Promise<LeaderboardEntry[]> {
  try {
    let query = await supabase.from("user_learning_stats").select(LEADERBOARD_SELECT)
    if (query.error) {
      query = await supabase.from("user_learning_stats").select(LEADERBOARD_SELECT_LEGACY)
    }
    if (query.error) return []
    return parseLearningStatsRows(query.data)
      .filter((row) => row.visible || row.user_id === currentUserId)
      .map((row) => toLeaderboardEntry(row, period, currentUserId))
  } catch {
    return []
  }
}
