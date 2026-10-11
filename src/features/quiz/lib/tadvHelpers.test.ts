/// <reference types="node" />
import { afterEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { adaptTadvBank } from "@/features/quiz/lib/tadvHelpers"
import { loadQuizQuestions } from "@/features/quiz/api/loadQuizQuestions"
import { FREE_BANK_BUCKET } from "@/features/quiz/api/freeBankStorage"
import { getSubjectById } from "@/data/subjects"
import { parseQuestionBank } from "@/features/quiz/lib/questionBankSchema"
import type { BankFile } from "@/features/quiz/model/quiz.types"
import { R2_PUBLIC_BASE } from "@/lib/mediaUrl"

const storageDownloadMock = vi.hoisted(() => vi.fn())
const storageFromMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase", () => ({
  supabase: { storage: { from: storageFromMock } },
}))
storageFromMock.mockImplementation(() => ({ download: storageDownloadMock }))

const setup = { mode: "practice", questionOrder: "original", answerOrder: "original", timed: false, durationMinutes: 0 } as const

const bank: BankFile = {
  title: "Sample",
  parts: [
    {
      partNumber: 1,
      partTitle: "PART 1: Listening",
      instruction: "Choose the correct answer.",
      audioUrl: "tadv/test01/part1-audio.mp3",
      questions: [
        {
          id: 1,
          question: "What time are they meeting?",
          audioTimestamp: "0:10",
          transcript: "Let's meet at 3.",
          options: { A: "2:00", B: "2:30", C: "3:00" },
          answer: "C",
          correct_answer: "C",
          correct_text: "3:00",
          type: "listening_announcement",
          analysis: {
            A: { status: "incorrect", reason: "Wrong hour." },
            C: { status: "correct", reason: "Right hour." },
          },
          vocabulary: [{ phrase: "meet", paraphrases: ["gather"], meaning: "gặp" }],
          strategy: ["Step 1: listen.", "Step 2: choose."],
          explainAnswer: "They meet at 3.",
        },
        {
          id: 2,
          question: "Second question?",
          options: { A: "x", B: "y" },
          answer: "A",
          explainAnswer: "Because A.",
        },
      ],
    },
    {
      partNumber: 3,
      partTitle: "PART 3: Grammar",
      instruction: "Choose the correct answer.",
      questions: [
        {
          id: 11,
          question: "She ___ up early.",
          options: { A: "get", B: "gets" },
          answer: "B",
          correct_answer: "B",
          type: "grammar",
          grammar_point: "Present Simple",
          analysis: { B: { status: "correct", reason: "Third person -s." } },
          explainAnswer: "She goes with gets.",
        },
      ],
    },
    {
      partNumber: 5,
      partTitle: "PART 5: Notices",
      instruction: "Choose the correct answer.",
      questions: [
        {
          id: 41,
          question: "What does the notice mean?",
          options: { A: "opt A", B: "opt B" },
          answer: "B",
          imageUrl: "tadv/test01/1.png",
          image_description: "A notice image.",
          explainAnswer: "Notice says B.",
        },
      ],
    },
  ],
}

describe("tadv bank adapter", () => {
  it("maps parts, media, and TOEIC-style rich fields", () => {
    const questions = adaptTadvBank(bank, "tadv-sample", setup)

    expect(questions).toHaveLength(4)

    const listening = questions[0]
    expect(listening.section).toBe("Listening")
    expect(listening.partTitle).toBe("PART 1: Listening")
    expect(listening.audioUrl).toBe(`${R2_PUBLIC_BASE}/tadv/test01/part1-audio.mp3`)
    expect(listening.audioTimestamp).toBe("0:10")
    expect(listening.options).toEqual(["2:00", "2:30", "3:00"])
    expect(listening.correctIndex).toBe(2)
    expect(listening.explanation).toBe("They meet at 3.")
    expect(listening.questionType).toBe("listening_announcement")
    expect(listening.detailedExplanation).toContain("Phân tích lựa chọn:")
    expect(listening.detailedExplanation).toContain("C ✓ Đúng: Right hour.")
    expect(listening.detailedExplanation).toContain("Từ vựng:")
    expect(listening.detailedExplanation).toContain("- meet: gặp (gather)")
    expect(listening.detailedExplanation).toContain("Chiến lược:")
    expect(listening.detailedExplanation).toContain("Transcript:\nLet's meet at 3.")

    const grammar = questions[2]
    expect(grammar.section).toBe("Reading")
    expect(grammar.grammarPoint).toBe("Present Simple")
    expect(grammar.detailedExplanation).toContain("Điểm ngữ pháp: Present Simple")

    const notice = questions[3]
    expect(notice.imageUrl).toBe(`${R2_PUBLIC_BASE}/tadv/test01/1.png`)
    expect(notice.detailedExplanation).toContain("Mô tả hình ảnh: A notice image.")

    expect(new Set(questions.map((q) => q.id)).size).toBe(4)
  })

  it("falls back to analysis reason when explainAnswer is missing", () => {
    const minimal: BankFile = {
      parts: [
        {
          partNumber: 4,
          partTitle: "PART 4: Vocabulary",
          questions: [
            {
              id: 26,
              question: "Pick one.",
              options: { A: "a", B: "b" },
              answer: "A",
              correct_answer: "A",
              analysis: { A: { status: "correct", reason: "A fits." } },
            },
          ],
        },
      ],
    }
    const [question] = adaptTadvBank(minimal, "tadv-sample", setup)
    expect(question.correctIndex).toBe(0)
    expect(question.explanation).toBe("A fits.")
  })

  it("adapts the real refactored TADV bank (50 questions)", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../r2-banks/data")
    const raw = JSON.parse(readFileSync(resolve(root, "tadv/test01/test01.json"), "utf8"))
    const parsed = parseQuestionBank(raw, "tadv/test01/test01.json")
    const questions = adaptTadvBank(parsed, "tadv-sample", setup)

    expect(questions).toHaveLength(50)
    expect(questions.filter((q) => q.section === "Listening")).toHaveLength(10)
    expect(questions.filter((q) => q.section === "Reading")).toHaveLength(40)
    for (const q of questions) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.explanation, `question ${q.id} missing explanation`).toBeTruthy()
    }
    const withDetail = questions.filter((q) => q.detailedExplanation)
    // Every refactored question carries analysis/vocabulary/strategy.
    expect(withDetail.length).toBe(50)
    expect(questions[0].audioUrl).toContain("part1-audio.mp3")
    expect(questions.find((q) => q.imageUrl?.endsWith("/tadv/test01/1.png"))).toBeTruthy()
  })

  it("loads the free TADV exam from Storage with details on every question", async () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../r2-banks/data")
    const raw = readFileSync(resolve(root, "tadv/test01/test01.json"), "utf8")
    storageDownloadMock.mockResolvedValue({ data: new Blob([raw]), error: null })

    const subject = getSubjectById("tieng-anh-dau-vao")!
    const exam = subject.exams.find((e) => e.id === "tadv-sample")!
    const questions = await loadQuizQuestions({ subject, exam, setup, signal: new AbortController().signal })

    expect(storageFromMock).toHaveBeenCalledWith(FREE_BANK_BUCKET)
    expect(storageDownloadMock).toHaveBeenCalledWith("tadv/test01/test01.json")
    expect(questions).toHaveLength(50)
    for (const q of questions) {
      expect(q.detailedExplanation, `question ${q.id} missing detailedExplanation`).toBeTruthy()
    }
  })
})

afterEach(() => vi.unstubAllGlobals())
