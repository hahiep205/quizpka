import { describe, expect, it } from "vitest"
import { parsePracticeSession } from "@/lib/practiceSession"

const setup = { mode: "practice", questionOrder: "original", answerOrder: "original", timed: false, durationMinutes: 0 }

describe("practice session persistence", () => {
  it("reads a complete and valid persisted session", () => {
    expect(parsePracticeSession({ examId: "hcm-final-bank-1", subjectId: "tu-tuong-ho-chi-minh", setup, lang: "vi", chapterId: "c1" })).toMatchObject({ examId: "hcm-final-bank-1", chapterId: "c1" })
  })

  it("rejects malformed or unknown persisted sessions", () => {
    expect(parsePracticeSession({ examId: "x", subjectId: "unknown", setup, lang: "vi" })).toBeNull()
    expect(parsePracticeSession({ examId: "x", subjectId: "toeic", setup: {}, lang: "vi" })).toBeNull()
  })
})
