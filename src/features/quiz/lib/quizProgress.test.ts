import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearQuizProgress,
  clearQuizProgressForExam,
  hasResumableProgress,
  isMatchingProgress,
  isProgressExpired,
  loadQuestionsSnapshot,
  loadQuizProgress,
  resumeElapsedSeconds,
  saveQuestionsSnapshot,
  saveQuizProgress,
  sortedQuestionIds,
  type QuizProgressKey,
} from "@/features/quiz/lib/quizProgress"

const key: QuizProgressKey = {
  userId: "u1",
  subjectId: "toeic",
  examId: "toeic-test-01",
  toeicScope: "part5",
  mode: "practice",
}

const base = {
  answers: { q1: 0 },
  currentIndex: 2,
  elapsedSeconds: 120,
  timed: true,
  orderedIds: ["q1", "q2", "q3"],
  sortedIds: ["q1", "q2", "q3"],
}

beforeEach(() => localStorage.clear())

describe("quiz progress autosave", () => {
  it("round-trips a progress record", () => {
    saveQuizProgress(key, base)
    const loaded = loadQuizProgress(key)
    expect(loaded?.answers).toEqual({ q1: 0 })
    expect(loaded?.currentIndex).toBe(2)
    expect(loaded?.orderedIds).toEqual(["q1", "q2", "q3"])
  })

  it("isolates records per key (exam/mode/user)", () => {
    saveQuizProgress(key, base)
    expect(loadQuizProgress({ ...key, mode: "exam" })).toBeNull()
    expect(loadQuizProgress({ ...key, userId: "u2" })).toBeNull()
    expect(loadQuizProgress({ ...key, examId: "other" })).toBeNull()
  })

  it("discards expired records", () => {
    saveQuizProgress(key, base)
    const expiredAt = Date.now() - 8 * 24 * 60 * 60 * 1000
    vi.spyOn(Date, "now").mockReturnValue(expiredAt)
    saveQuizProgress(key, base)
    vi.restoreAllMocks()
    expect(loadQuizProgress(key)).toBeNull()
  })

  it("matches only the same question set", () => {
    const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }]
    expect(isMatchingProgress({ ...base, version: 1, savedAt: Date.now() }, questions)).toBe(true)
    expect(isMatchingProgress({ ...base, version: 1, savedAt: Date.now() }, [{ id: "q1" }, { id: "q2" }])).toBe(false)
    expect(isMatchingProgress({ ...base, version: 1, savedAt: Date.now() }, [{ id: "q1" }, { id: "q2" }, { id: "qX" }])).toBe(false)
    expect(sortedQuestionIds([{ id: "b" }, { id: "a" }])).toEqual(["a", "b"])
  })

  it("keeps the timed clock running on wall-clock while away", () => {
    const savedAt = Date.now() - 90 * 1000
    const timed = { ...base, version: 1 as const, savedAt, elapsedSeconds: 120, timed: true }
    expect(resumeElapsedSeconds(timed, savedAt + 90 * 1000)).toBe(210)
    const untimed = { ...timed, timed: false }
    expect(resumeElapsedSeconds(untimed, savedAt + 90 * 1000)).toBe(120)
  })

  it("clears a record", () => {
    saveQuizProgress(key, base)
    clearQuizProgress(key)
    expect(loadQuizProgress(key)).toBeNull()
  })

  it("clears every user's autosave for a fresh attempt of the same exam", () => {
    saveQuizProgress(key, base)
    saveQuizProgress({ ...key, userId: "guest" }, base)
    saveQuizProgress({ ...key, examId: "other" }, base)
    saveQuestionsSnapshot({ ...key, userId: "guest" }, [])

    clearQuizProgressForExam({ subjectId: key.subjectId, examId: key.examId, chapterId: key.chapterId, toeicScope: key.toeicScope, mode: key.mode })

    expect(loadQuizProgress(key)).toBeNull()
    expect(loadQuizProgress({ ...key, userId: "guest" })).toBeNull()
    expect(loadQuestionsSnapshot({ ...key, userId: "guest" })).toBeNull()
    expect(loadQuizProgress({ ...key, examId: "other" })).not.toBeNull()
  })
})

describe("expired empty attempts are not resumed", () => {
  it("treats a record with no answers as non-resumable", () => {
    const empty = { ...base, version: 1 as const, savedAt: Date.now(), answers: {} }
    expect(hasResumableProgress(empty)).toBe(false)
    expect(hasResumableProgress({ ...empty, answers: { q1: 0 } })).toBe(true)
  })

  it("treats a hard-mode record with progress as resumable", () => {
    const empty = { ...base, version: 1 as const, savedAt: Date.now(), answers: {} }
    expect(hasResumableProgress({ ...empty, hard: { queueIds: ["q1"], pos: 1, mastered: 0, wrongCounts: {}, finalAnswers: {} } })).toBe(true)
    expect(hasResumableProgress({ ...empty, hard: { queueIds: ["q1"], pos: 0, mastered: 0, wrongCounts: {}, finalAnswers: {} } })).toBe(false)
  })

  it("flags a timed clock that ran out while away", () => {
    const savedAt = Date.now() - 40 * 60 * 1000
    const timed = { ...base, version: 1 as const, savedAt, elapsedSeconds: 25 * 60, timed: true }
    expect(isProgressExpired(timed, 60, savedAt + 40 * 60 * 1000)).toBe(true)
    expect(isProgressExpired(timed, 120, savedAt + 40 * 60 * 1000)).toBe(false)
    expect(isProgressExpired({ ...timed, timed: false }, 60, savedAt + 40 * 60 * 1000)).toBe(false)
  })
})
