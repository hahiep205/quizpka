import { describe, expect, it } from "vitest"
import { parseActivityRows, parseAttemptRows } from "@/features/activity/lib/activityLog"

describe("activityLog parsers", () => {
  it("parses valid events and drops invalid ones, sorted desc", () => {
    const rows = parseActivityRows([
      { id: 1, user_id: "u1", event_type: "login", metadata: { a: 1 }, created_at: "2026-01-01T00:00:00Z" },
      { id: 2, user_id: "u1", event_type: "submit_attempt", metadata: {}, created_at: "2026-01-02T00:00:00Z" },
      { id: 3, user_id: "", event_type: "login", metadata: {}, created_at: "" },
      { id: 4, user_id: "u2", event_type: "nope", metadata: {}, created_at: "" },
    ])
    expect(rows.map((r) => r.id)).toEqual([2, 1])
  })

  it("parses attempt rows", () => {
    const rows = parseAttemptRows([
      { user_id: "u1", history_id: "h1", exam_id: "e1", subject_id: "s1", title: "T", mode: "exam", score: 8, correct: 8, total: 10, accuracy: 80, duration_seconds: 600, completed_at: "2026-01-01T00:00:00Z", retry_of: null, retry_number: null },
      { user_id: "", history_id: "h2" },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.accuracy).toBe(80)
  })
})
