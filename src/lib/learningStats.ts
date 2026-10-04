import type { PracticeHistoryItem } from "@/lib/practiceSession"

const LEARNING_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type LearningPeriod = "week" | "month" | "all"
export type LearningStats = {
  subjectsReviewed: number
  attempts: number
  averageAccuracy: number
  totalDurationSeconds: number
}

function isWithinLearningWeek(completedAt: string, now = Date.now()): boolean {
  const completed = Date.parse(completedAt)
  return Number.isFinite(completed) && now - completed <= LEARNING_WEEK_MS
}

function isWithinLearningMonth(completedAt: string, now = Date.now()): boolean {
  const completed = Date.parse(completedAt)
  if (!Number.isFinite(completed)) return false
  const completedDate = new Date(completed)
  const nowDate = new Date(now)
  return completedDate.getFullYear() === nowDate.getFullYear() && completedDate.getMonth() === nowDate.getMonth()
}

export function computeLearningStats(history: PracticeHistoryItem[], period: LearningPeriod = "all", now = Date.now()): LearningStats {
  const items = period === "week"
    ? history.filter((item) => isWithinLearningWeek(item.completedAt, now))
    : period === "month"
      ? history.filter((item) => isWithinLearningMonth(item.completedAt, now))
      : history
  const subjects = new Set<string>()
  let accuracyTotal = 0
  let durationTotal = 0
  for (const attempt of items) {
    subjects.add(attempt.subjectId)
    accuracyTotal += Number.isFinite(attempt.accuracy) ? attempt.accuracy : 0
    durationTotal += Number.isFinite(attempt.durationSeconds) ? Math.max(0, attempt.durationSeconds) : 0
  }
  return {
    subjectsReviewed: subjects.size,
    attempts: items.length,
    averageAccuracy: items.length ? Math.round(accuracyTotal / items.length) : 0,
    totalDurationSeconds: durationTotal,
  }
}

export function formatLearningDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function sortValueForStats(stats: LearningStats, points: number, key: "points" | "subjects" | "attempts" | "accuracy" | "time"): number {
  if (key === "subjects") return stats.subjectsReviewed
  if (key === "attempts") return stats.attempts
  if (key === "accuracy") return stats.averageAccuracy
  if (key === "time") return stats.totalDurationSeconds
  return points
}
