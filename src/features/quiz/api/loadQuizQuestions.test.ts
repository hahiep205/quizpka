import { afterEach, describe, expect, it, vi } from "vitest"
import { loadQuizQuestions } from "@/features/quiz/api/loadQuizQuestions"
import { getSubjectById, type ExamPaper } from "@/data/subjects"
import { QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"

const setup = { mode: "practice", questionOrder: "original", answerOrder: "original", timed: false, durationMinutes: 0 } as const
const subject = getSubjectById("chu-nghia-xa-hoi-khoa-hoc")!
const exam: ExamPaper = {
  id: "test-exam",
  type: "final",
  year: 2026,
  questionCount: 2,
  durationMinutes: 10,
  title: { en: "Test", vi: "Kiểm tra" },
  description: { en: "Test", vi: "Kiểm tra" },
  questionBank: "/data/test.json",
}

afterEach(() => vi.unstubAllGlobals())

describe("quiz question loader", () => {
  it("validates, filters, and maps a chapter bank without mutating fetched data", async () => {
    const bank = { questions: [
      { id: 28, question: "Q1", answer: "A", options: { A: "Correct" } },
      { id: 29, question: "Q2", answer: "A", options: { A: "Correct" } },
    ] }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(bank), { status: 200 })))

    const questions = await loadQuizQuestions({ subject, exam, setup, chapterId: "c2", signal: new AbortController().signal })

    expect(questions).toHaveLength(1)
    expect(questions[0].prompt).toBe("Q2")
    expect(bank.questions).toHaveLength(2)
  })

  it("surfaces a source-specific error for bad responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })))
    await expect(loadQuizQuestions({ subject, exam, setup, signal: new AbortController().signal })).rejects.toMatchObject({ source: "/data/test.json" } satisfies Partial<QuestionBankDataError>)
  })
})
