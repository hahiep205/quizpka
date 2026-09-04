import { describe, expect, it } from "vitest"
import { bucketLast14Days, eventsByType, filterByDays, topLearners, topSubjects } from "@/features/admin/lib/adminOverview"

const NOW = Date.parse("2026-09-04T12:00:00.000Z")

describe("adminOverview", () => {
  it("buckets attempts and events into last 14 days", () => {
    const buckets = bucketLast14Days(
      [{ completedAt: "2026-09-04T01:00:00.000Z" } as never, { completedAt: "2026-08-01T00:00:00.000Z" } as never],
      [{ createdAt: "2026-09-03T01:00:00.000Z" } as never],
      NOW,
    )
    expect(buckets).toHaveLength(14)
    expect(buckets[13]?.date).toBe("2026-09-04")
    expect(buckets[13]?.attempts).toBe(1)
    expect(buckets[12]?.events).toBe(1)
    expect(buckets.reduce((s, b) => s + b.attempts, 0)).toBe(1)
  })

  it("ranks top subjects and learners", () => {
    const attempts = [
      { userId: "u1", subjectId: "math", accuracy: 80 },
      { userId: "u1", subjectId: "math", accuracy: 100 },
      { userId: "u2", subjectId: "eng", accuracy: 50 },
    ] as never[]
    expect(topSubjects(attempts as never)[0]).toMatchObject({ key: "math", count: 2 })
    const learners = topLearners(attempts as never)
    expect(learners[0]).toMatchObject({ userId: "u1", attempts: 2, avgAccuracy: 90 })
  })

  it("counts events by type", () => {
    const rows = eventsByType([{ eventType: "login" }, { eventType: "login" }, { eventType: "submit_attempt" }] as never)
    expect(rows[0]).toMatchObject({ key: "login", count: 2 })
  })

  it("filters items by recent days, 0 keeps all", () => {
    const items = [
      { d: "2026-09-04T01:00:00.000Z" },
      { d: "2026-08-01T00:00:00.000Z" },
      { d: "not-a-date" },
    ]
    expect(filterByDays(items, (i) => i.d, 7, NOW)).toHaveLength(1)
    expect(filterByDays(items, (i) => i.d, 0, NOW)).toHaveLength(3)
  })
})
