import { describe, expect, it } from "vitest"
import { computeLearningPoints, computeLearningStats, formatLearningDuration, normalizeAttempts, normalizeAccuracy, normalizeSubjectsReviewed, normalizeTimeEfficiency, sortValueForStats } from "./learningStats"
import type { PracticeHistoryItem } from "./practiceSession"

function item(overrides: Partial<PracticeHistoryItem>): PracticeHistoryItem {
  return {
    id: "1",
    examId: "exam",
    subjectId: "tieng-anh-dau-vao",
    title: "TA",
    mode: "practice",
    score: 8,
    correct: 40,
    total: 50,
    accuracy: 80,
    durationSeconds: 600,
    completedAt: new Date().toISOString(),
    setup: { mode: "practice", questionOrder: "original", answerOrder: "original", timed: false, durationMinutes: 0 },
    lang: "vi",
    ...overrides,
  } as PracticeHistoryItem
}

describe("learning stats", () => {
  it("aggregates subjects, attempts, accuracy and duration", () => {
    const stats = computeLearningStats([
      item({ id: "a", subjectId: "tieng-anh-dau-vao", accuracy: 80, durationSeconds: 120 }),
      item({ id: "b", subjectId: "kinh-te-chinh-tri-mac-lenin", accuracy: 60, durationSeconds: 180 }),
    ], "all")
    expect(stats).toEqual({
      subjectsReviewed: 2,
      attempts: 2,
      averageAccuracy: 70,
      totalDurationSeconds: 300,
    })
  })

  it("filters this week independently from all-time history", () => {
    const now = Date.parse("2026-09-04T00:00:00.000Z")
    const stats = computeLearningStats([
      item({ id: "new", completedAt: "2026-09-02T00:00:00.000Z", accuracy: 100, durationSeconds: 60 }),
      item({ id: "old", completedAt: "2026-08-01T00:00:00.000Z", accuracy: 10, durationSeconds: 3600 }),
    ], "week", now)
    expect(stats).toEqual({
      subjectsReviewed: 1,
      attempts: 1,
      averageAccuracy: 100,
      totalDurationSeconds: 60,
    })
  })

  it("filters this calendar month independently from older history", () => {
    const now = Date.parse("2026-09-20T00:00:00.000Z")
    const stats = computeLearningStats([
      item({ id: "this-month", completedAt: "2026-09-02T00:00:00.000Z", accuracy: 90, durationSeconds: 120 }),
      item({ id: "last-month", completedAt: "2026-08-31T00:00:00.000Z", accuracy: 10, durationSeconds: 3600 }),
    ], "month", now)
    expect(stats).toEqual({
      subjectsReviewed: 1,
      attempts: 1,
      averageAccuracy: 90,
      totalDurationSeconds: 120,
    })
  })

  it("scores points with accuracy-first weights on a 1000 scale", () => {
    const stats = {
      subjectsReviewed: 10,
      attempts: 20,
      averageAccuracy: 100,
      totalDurationSeconds: 20 * 15 * 60,
    }
    expect(normalizeAccuracy(stats)).toBe(100)
    expect(normalizeTimeEfficiency(stats)).toBe(100)
    expect(normalizeSubjectsReviewed(stats)).toBe(100)
    expect(normalizeAttempts(stats)).toBe(100)
    expect(computeLearningPoints(stats)).toBe(1000)
  })

  it("weights accuracy at 50% and time efficiency at 25%", () => {
    const stats = {
      subjectsReviewed: 0,
      attempts: 4,
      averageAccuracy: 80,
      totalDurationSeconds: 4 * 20 * 60,
    }
    expect(normalizeTimeEfficiency(stats)).toBe(100)
    expect(normalizeSubjectsReviewed(stats)).toBe(0)
    expect(normalizeAttempts(stats)).toBe(20)
    expect(computeLearningPoints(stats)).toBe(Math.round((80 * 0.5 + 100 * 0.25 + 0 * 0.15 + 20 * 0.1) * 10))
  })

  it("does not reward rushing or empty practice", () => {
    expect(computeLearningPoints({
      subjectsReviewed: 1,
      attempts: 0,
      averageAccuracy: 100,
      totalDurationSeconds: 0,
    })).toBe(0)
    expect(normalizeTimeEfficiency({
      subjectsReviewed: 1,
      attempts: 2,
      averageAccuracy: 90,
      totalDurationSeconds: 40,
    })).toBeLessThan(30)
  })

  it("formats duration like the dashboard cards", () => {
    expect(formatLearningDuration(0)).toBe("0m")
    expect(formatLearningDuration(125)).toBe("2m")
    expect(formatLearningDuration(3720)).toBe("1h 2m")
  })

  it("maps leaderboard sort keys onto the same stats", () => {
    const stats = { subjectsReviewed: 4, attempts: 9, averageAccuracy: 88, totalDurationSeconds: 400 }
    expect(sortValueForStats(stats, 120, "subjects")).toBe(4)
    expect(sortValueForStats(stats, 120, "attempts")).toBe(9)
    expect(sortValueForStats(stats, 120, "accuracy")).toBe(88)
    expect(sortValueForStats(stats, 120, "time")).toBe(400)
    expect(sortValueForStats(stats, 120, "points")).toBe(120)
  })
})
