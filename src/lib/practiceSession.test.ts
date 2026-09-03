import { beforeEach, describe, expect, it } from "vitest"
import { PRACTICE_HISTORY_KEY, parsePracticeSession, readPracticeHistory } from "@/lib/practiceSession"

const setup = { mode: "practice", questionOrder: "original", answerOrder: "original", timed: false, durationMinutes: 0 }

describe("practice session persistence", () => {
  beforeEach(() => localStorage.clear())

  it("reads a complete and valid persisted session", () => {
    expect(parsePracticeSession({ examId: "hcm-final-bank-1", subjectId: "tu-tuong-ho-chi-minh", setup, lang: "vi", chapterId: "c1", retryOfHistoryId: "attempt-1", retryNumber: 2 })).toMatchObject({ examId: "hcm-final-bank-1", chapterId: "c1", retryOfHistoryId: "attempt-1", retryNumber: 2 })
  })

  it("ignores invalid retry metadata", () => {
    expect(parsePracticeSession({ examId: "hcm-final-bank-1", subjectId: "tu-tuong-ho-chi-minh", setup, lang: "vi", retryOfHistoryId: 123, retryNumber: 0 })).toMatchObject({ retryOfHistoryId: undefined, retryNumber: undefined })
  })

  it("rejects malformed or unknown persisted sessions", () => {
    expect(parsePracticeSession({ examId: "x", subjectId: "unknown", setup, lang: "vi" })).toBeNull()
    expect(parsePracticeSession({ examId: "x", subjectId: "toeic", setup: {}, lang: "vi" })).toBeNull()
  })

  it("never exposes global or another user's history to a new account", () => {
    const oldAttempt = { id: "old-attempt", completedAt: "2026-09-01T00:00:00.000Z" }
    const newAttempt = { id: "new-attempt", userId: "new-user", completedAt: "2026-09-04T02:00:00.000Z" }
    localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify([oldAttempt]))
    localStorage.setItem(`${PRACTICE_HISTORY_KEY}:new-user`, JSON.stringify([oldAttempt, { ...newAttempt, userId: "old-user" }, newAttempt]))

    expect(readPracticeHistory("new-user", "2026-09-04T01:00:00.000Z").map((item) => item.id)).toEqual(["new-attempt"])
  })
})
