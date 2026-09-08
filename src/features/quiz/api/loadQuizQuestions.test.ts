import { afterEach, describe, expect, it, vi } from "vitest"
import { loadQuizQuestions } from "@/features/quiz/api/loadQuizQuestions"
import { getSubjectById, type ExamPaper } from "@/data/subjects"
import { QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"

const invokeMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: invokeMock } } }))

const setup = { mode: "practice", questionOrder: "original", answerOrder: "original", timed: false, durationMinutes: 0 } as const
const subject = getSubjectById("chu-nghia-xa-hoi-khoa-hoc-giua-ky")!
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
      { id: 28, chapter: "Chương 1: Nhập môn Chủ nghĩa xã hội khoa học", question: "Q1", answer: "A", options: { A: "Correct" } },
      { id: 29, chapter: "Chương 2: Sứ mệnh lịch sử của giai cấp công nhân", question: "Q2", answer: "A", options: { A: "Correct" } },
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

  it("merges multiple general banks, filters by chapter, and keeps mapped ids unique", async () => {
    const lsdSubject = getSubjectById("lich-su-dang-cong-san-viet-nam-giua-ky")!
    const multiExam: ExamPaper = {
      id: "multi-bank-exam",
      type: "final",
      year: 2026,
      questionCount: 4,
      durationMinutes: 10,
      title: { en: "Multi", vi: "Đa" },
      description: { en: "Multi", vi: "Đa" },
      questionBanks: ["/data/bank-a.json", "/data/bank-b.json"],
    }
    const bankA = { questions: [
      { id: 1, chapter: "Chương 1", question: "Q1A", answer: "A", options: { A: "Correct" } },
      { id: 2, chapter: "Chương 2", question: "Q2A", answer: "A", options: { A: "Correct" } },
    ] }
    const bankB = { questions: [
      { id: 1, chapter: "Chương 1", question: "Q1B", answer: "A", options: { A: "Correct" } },
      { id: 3, chapter: "Chương 3", question: "Q3B", answer: "A", options: { A: "Correct" } },
    ] }
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(bankA), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(bankB), { status: 200 })))

    const questions = await loadQuizQuestions({ subject: lsdSubject, exam: multiExam, setup, chapterId: "c1", signal: new AbortController().signal })

    expect(questions.map((question) => question.prompt).sort()).toEqual(["Q1A", "Q1B"])
    expect(new Set(questions.map((question) => question.id)).size).toBe(2)
  })

  it("loads the paid HCM bank through the gated function and filters chapters by label", async () => {
    const hcmSubject = getSubjectById("tu-tuong-ho-chi-minh")!
    const hcmExam = hcmSubject.exams[0]
    invokeMock.mockResolvedValue({ data: { questions: [
      { id: 1, chapter: "Chương 1", question: "Q1A", answer: "A", options: { A: "Correct" } },
      { id: 2, chapter: "Chương 2", question: "Q2A", answer: "A", options: { A: "Correct" } },
      { id: 3, chapter: "Chương 3", question: "Q3B", answer: "A", options: { A: "Correct" } },
      { id: 4, chapter: "Chương 4", question: "Q4B", answer: "A", options: { A: "Correct" } },
    ] }, error: null })

    const c1Questions = await loadQuizQuestions({ subject: hcmSubject, exam: hcmExam, setup, chapterId: "c1", signal: new AbortController().signal })
    expect(c1Questions.map((question) => question.prompt)).toEqual(["Q1A"])
    expect(new Set(c1Questions.map((question) => question.id)).size).toBe(1)

    const midQuestions = await loadQuizQuestions({ subject: hcmSubject, exam: hcmExam, setup, chapterId: "c123_mid", signal: new AbortController().signal })
    expect(midQuestions.map((question) => question.prompt).sort()).toEqual(["Q1A", "Q2A", "Q3B"])
    expect(new Set(midQuestions.map((question) => question.id)).size).toBe(3)

    expect(invokeMock).toHaveBeenCalledWith("get-paid-question-bank", {
      body: { examId: "hcm-final-bank-1", subjectId: "tu-tuong-ho-chi-minh" },
    })
  })

  it("loads the paid SOC101 final bank through the gated function (not fallback)", async () => {
    const socSubject = getSubjectById("chu-nghia-xa-hoi-khoa-hoc")!
    const socExam = socSubject.exams[0]
    invokeMock.mockResolvedValue({ data: { questions: [
      { id: 1, chapter: "Chương 5: Cơ cấu xã hội", question: "Q5", answer: "A", options: { A: "Correct" } },
      { id: 2, chapter: "Chương 1: Nhập môn", question: "Q1", answer: "A", options: { A: "Correct" } },
    ] }, error: null })

    const questions = await loadQuizQuestions({ subject: socSubject, exam: socExam, setup, chapterId: "c5", signal: new AbortController().signal })

    expect(questions.map((question) => question.prompt)).toEqual(["Q5"])
    expect(invokeMock).toHaveBeenCalledWith("get-paid-question-bank", {
      body: { examId: "scientific-socialism-final-bank-1", subjectId: "chu-nghia-xa-hoi-khoa-hoc" },
    })
  })
})
