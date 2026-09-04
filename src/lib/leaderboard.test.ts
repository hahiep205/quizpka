import { describe, expect, it } from "vitest"
import { parseLearningStatsRows, rankLeaderboard, toLeaderboardEntry } from "./leaderboard"

describe("leaderboard", () => {
  it("parses remote stats rows and ranks by the selected dashboard metric", () => {
    const rows = parseLearningStatsRows([
      { user_id: "b", display_name: "Binh", visible: true, subjects_reviewed: 1, attempts: 8, average_accuracy: 90, total_duration_seconds: 60, points: 10, week_subjects_reviewed: 1, week_attempts: 2, week_average_accuracy: 70, week_total_duration_seconds: 20, week_points: 5 },
      { user_id: "a", display_name: "An", visible: true, subjects_reviewed: 4, attempts: 3, average_accuracy: 50, total_duration_seconds: 600, points: 40, week_subjects_reviewed: 0, week_attempts: 0, week_average_accuracy: 0, week_total_duration_seconds: 0, week_points: 0 },
      { user_id: "hidden", display_name: "Ghost", visible: false },
    ])
    expect(rows).toHaveLength(3)
    const all = rows.filter((row) => row.visible).map((row) => toLeaderboardEntry(row, "all", "a"))
    expect(rankLeaderboard(all, "subjects").map((entry) => entry.userId)).toEqual(["a", "b"])
    expect(rankLeaderboard(all, "attempts").map((entry) => entry.userId)).toEqual(["b", "a"])
    expect(all.find((entry) => entry.isYou)?.userId).toBe("a")
  })
})
