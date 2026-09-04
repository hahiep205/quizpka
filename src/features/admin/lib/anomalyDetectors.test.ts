import { describe, expect, it } from "vitest"
import {
  detectAllAnomalies,
  detectDuplicateSubmits,
  detectPerfectTooFast,
  detectProfileSpam,
  detectSubmitSpam,
  detectSuperFast,
  riskScore,
} from "@/features/admin/lib/anomalyDetectors"
import type { ActivityEvent, PracticeAttemptRow } from "@/features/activity/lib/activityLog"

function attempt(over: Partial<PracticeAttemptRow> & { historyId: string; userId: string }): PracticeAttemptRow {
  return {
    examId: "e1", subjectId: "math", title: "Đề", mode: "exam",
    score: 5, correct: 5, total: 20, accuracy: 50, durationSeconds: 600,
    completedAt: "2026-09-04T10:00:00.000Z",
    ...over,
  }
}

function event(over: Partial<ActivityEvent> & { userId: string }): ActivityEvent {
  return { id: 1, eventType: "login", metadata: {}, createdAt: "2026-09-04T10:00:00.000Z", ...over }
}

describe("anomalyDetectors (A1/A2/A3/A6/A7)", () => {
  it("A1 flags exam siêu tốc, bỏ qua practice và đề ngắn", () => {
    const rows = [
      attempt({ historyId: "h1", userId: "u1", durationSeconds: 38, total: 20, mode: "exam" }), // 1.9s/câu
      attempt({ historyId: "h2", userId: "u1", durationSeconds: 38, total: 20, mode: "practice" }),
      attempt({ historyId: "h3", userId: "u1", durationSeconds: 5, total: 2, mode: "exam" }),
      attempt({ historyId: "h4", userId: "u1", durationSeconds: 600, total: 20, mode: "exam" }),
    ]
    const flags = detectSuperFast(rows)
    expect(flags.map((f) => f.evidence.historyIds?.[0])).toEqual(["h1"])
    expect(flags[0]?.severity).toBe("high")
  })

  it("A2 flags 100% quá nhanh, bỏ qua 100% làm chậm", () => {
    const rows = [
      attempt({ historyId: "h1", userId: "u1", accuracy: 100, correct: 20, durationSeconds: 60, total: 20, mode: "exam" }),
      attempt({ historyId: "h2", userId: "u1", accuracy: 100, correct: 20, durationSeconds: 1200, total: 20, mode: "exam" }),
    ]
    expect(detectPerfectTooFast(rows).map((f) => f.evidence.historyIds?.[0])).toEqual(["h1"])
  })

  it("A3 flags cụm spam, mỗi cụm 1 lần", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      attempt({ historyId: `h${i}`, userId: "u1", completedAt: `2026-09-04T10:${String(i).padStart(2, "0")}:00.000Z` }),
    )
    const flags = detectSubmitSpam(rows)
    expect(flags).toHaveLength(1)
    expect(flags[0]?.code).toBe("A3")
    expect(detectSubmitSpam(rows.slice(0, 9))).toHaveLength(0)
  })

  it("A6 flags 2 lượt cùng đề cách nhau < 30s", () => {
    const rows = [
      attempt({ historyId: "h1", userId: "u1", examId: "e1", completedAt: "2026-09-04T10:00:00.000Z" }),
      attempt({ historyId: "h2", userId: "u1", examId: "e1", completedAt: "2026-09-04T10:00:20.000Z" }),
      attempt({ historyId: "h3", userId: "u1", examId: "e2", completedAt: "2026-09-04T10:00:25.000Z" }),
    ]
    const flags = detectDuplicateSubmits(rows)
    expect(flags).toHaveLength(1)
    expect(flags[0]?.evidence.historyIds).toEqual(["h1", "h2"])
  })

  it("A7 flags spam sửa profile theo ngày", () => {
    const evs = Array.from({ length: 6 }, (_, i) =>
      event({ id: i + 1, userId: "u1", eventType: "update_profile", createdAt: `2026-09-04T0${i}:00:00.000Z` }),
    )
    expect(detectProfileSpam(evs)).toHaveLength(1)
    expect(detectProfileSpam(evs.slice(0, 4))).toHaveLength(0)
  })

  it("detectAllAnomalies group theo user + riskScore có trọng số", () => {
    const rows = [
      attempt({ historyId: "h1", userId: "u1", durationSeconds: 30, total: 20, mode: "exam" }),
      attempt({ historyId: "h2", userId: "u2", durationSeconds: 900, total: 20, mode: "exam", accuracy: 80 }),
    ]
    const flags = detectAllAnomalies(rows, [])
    expect(flags.every((f) => f.userId === "u1")).toBe(true)
    expect(riskScore(flags)).toBeGreaterThanOrEqual(3)
    expect(riskScore([])).toBe(0)
  })
})
