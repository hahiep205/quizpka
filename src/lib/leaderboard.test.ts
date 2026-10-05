import { describe, expect, it } from "vitest"
import { computeLeaderboardScore, parseLearningStatsRows, rankLeaderboard, toLeaderboardEntry } from "./leaderboard"

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

  it("scores zero attempts as zero (no free Bayes boost)", () => {
    expect(computeLeaderboardScore({ accSum: 0, attempts: 0, subjects: 0, totalSubjects: 40, totalSeconds: 0 }))
      .toEqual({ score: 0, breakdown: { a: 0, c: 0, p: 0, t: 0, q: 0 } })
  })

  it("smooths accuracy with Bayes prior (1 perfect attempt < 20 good attempts)", () => {
    const one = computeLeaderboardScore({ accSum: 100, attempts: 1, subjects: 1, totalSubjects: 40, totalSeconds: 600 })
    // A = (1 + 1.2) / 3 ≈ 0.7333, Q = min(1, A/0.6) = 1
    expect(one.breakdown.a).toBeCloseTo(0.7333, 4)
    expect(one.breakdown.q).toBe(1)
    const many = computeLeaderboardScore({ accSum: 80 * 20, attempts: 20, subjects: 10, totalSubjects: 40, totalSeconds: 36000 })
    expect(many.score).toBeGreaterThan(one.score)
  })

  it("caps coverage, practice and study time at 1", () => {
    const { breakdown } = computeLeaderboardScore({ accSum: 90 * 50, attempts: 50, subjects: 100, totalSubjects: 40, totalSeconds: 100000 })
    expect(breakdown.c).toBe(1)
    expect(breakdown.p).toBe(1)
    expect(breakdown.t).toBe(1)
    // A = (45 + 1.2) / 52 ≈ 0.8885 -> score = round(1000 * (0.55*0.8885 + 0.45)) = 939
    expect(breakdown.a).toBeCloseTo(0.8885, 4)
  })

  it("matches the SQL formula on a known case", () => {
    // n=10, avg 80% -> accSum=800; subjects=5/40; 90min -> T=0.5; Q=1
    // A = (8 + 1.2)/12 = 0.7667; C = 0.125; P = ln11/ln21 ≈ 0.7876
    // score = round(1000*(0.55*0.7667 + 0.15*0.125 + 0.15*0.7876 + 0.15*0.5)) = 634
    const { score, breakdown } = computeLeaderboardScore({ accSum: 800, attempts: 10, subjects: 5, totalSubjects: 40, totalSeconds: 5400 })
    expect(breakdown.a).toBeCloseTo(0.7667, 4)
    expect(breakdown.c).toBe(0.125)
    expect(breakdown.p).toBeCloseTo(0.7876, 4)
    expect(breakdown.t).toBe(0.5)
    expect(breakdown.q).toBe(1)
    expect(score).toBe(634)
  })

  it("gates grinding behind accuracy (3% acc, 38 tries -> ~66, not ~380)", () => {
    // Case trong đề bài: 12 môn, 38 lần, 2h9m (= 7740s), acc 3%, tổng 20 môn.
    const { score, breakdown } = computeLeaderboardScore({ accSum: 3 * 38, attempts: 38, subjects: 12, totalSubjects: 20, totalSeconds: 7740 })
    expect(breakdown.a).toBeCloseTo(0.0585, 4)
    expect(breakdown.q).toBeCloseTo(0.0975, 4)
    expect(score).toBe(66)
  })

  it("parses v2 score columns and ranks by score", () => {
    const rows = parseLearningStatsRows([
      { user_id: "a", display_name: "An", visible: true, points: 999, score: 100, score_a: "0.5", score_c: 0.1, score_p: 0.1, score_t: 0.1 },
      { user_id: "b", display_name: "Binh", visible: true, points: 10, score: 900, score_a: 0.9, score_c: 0.5, score_p: 0.5, score_t: 0.5 },
    ])
    const entries = rows.map((row) => toLeaderboardEntry(row, "all", "a"))
    expect(entries.find((entry) => entry.userId === "b")?.breakdown).toEqual({ a: 0.9, c: 0.5, p: 0.5, t: 0.5, q: 1 })
    // Score mới thắng points cũ khi xếp hạng.
    expect(rankLeaderboard(entries, "points").map((entry) => entry.userId)).toEqual(["b", "a"])
  })
})
