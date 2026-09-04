import type { PracticeHistoryItem } from "@/lib/practiceSession"

export const LEARNING_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type LearningPeriod = "week" | "month" | "all"
export type LearningStats = {
  subjectsReviewed: number
  attempts: number
  averageAccuracy: number
  totalDurationSeconds: number
}

export function isWithinLearningWeek(completedAt: string, now = Date.now()): boolean {
  const completed = Date.parse(completedAt)
  return Number.isFinite(completed) && now - completed <= LEARNING_WEEK_MS
}

export function isWithinLearningMonth(completedAt: string, now = Date.now()): boolean {
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

export const LEARNING_POINT_WEIGHTS = {
  accuracy: 0.5,
  time: 0.25,
  subjects: 0.15,
  attempts: 0.1,
} as const

export const SUBJECT_BREADTH_TARGET = 10
export const ATTEMPT_TARGET = 20

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeAccuracy(stats: LearningStats): number {
  if (stats.attempts <= 0) return 0
  return clamp(stats.averageAccuracy, 0, 100)
}

export function normalizeSubjectsReviewed(stats: LearningStats): number {
  return clamp((Math.max(0, stats.subjectsReviewed) / SUBJECT_BREADTH_TARGET) * 100, 0, 100)
}

export function normalizeAttempts(stats: LearningStats): number {
  return clamp((Math.max(0, stats.attempts) / ATTEMPT_TARGET) * 100, 0, 100)
}

export function normalizeTimeEfficiency(stats: LearningStats): number {
  if (stats.attempts <= 0 || stats.totalDurationSeconds <= 0) return 0
  const averageMinutes = stats.totalDurationSeconds / stats.attempts / 60
  if (averageMinutes < 3) return clamp((averageMinutes / 3) * 80, 0, 80)
  if (averageMinutes < 8) return 80 + ((averageMinutes - 3) / 5) * 20
  if (averageMinutes <= 40) return 100
  return clamp(100 - (averageMinutes - 40) * 1.5, 20, 100)
}

export function computeLearningPoints(stats: LearningStats): number {
  if (stats.attempts <= 0) return 0
  const weighted =
    normalizeAccuracy(stats) * LEARNING_POINT_WEIGHTS.accuracy
    + normalizeTimeEfficiency(stats) * LEARNING_POINT_WEIGHTS.time
    + normalizeSubjectsReviewed(stats) * LEARNING_POINT_WEIGHTS.subjects
    + normalizeAttempts(stats) * LEARNING_POINT_WEIGHTS.attempts
  return Math.round(weighted * 10)
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
