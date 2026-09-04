import { describe, expect, it } from "vitest"
import { formatClockTime, isAnswerCorrect, mapBankQuestions } from "@/features/quiz/lib/quizHelpers"

const practiceSetup = { questionOrder: "original", answerOrder: "original", mode: "practice", timed: false, durationMinutes: 0 } as const

describe("quiz helpers", () => {
  it("maps option-based answers and preserves the correct index", () => {
    const [question] = mapBankQuestions({ questions: [{ id: 1, question: "Q", options: { A: "one", B: "two" }, answer: "B" }] }, "exam", practiceSetup)
    expect(question.correctIndex).toBe(1)
    expect(isAnswerCorrect(question, 1)).toBe(true)
    expect(isAnswerCorrect(question, 0)).toBe(false)
  })

  it("accepts normalized free-text answers", () => {
    const [question] = mapBankQuestions({ questions: [{ id: 1, question: "Q", answer: "hello / world" }] }, "exam", practiceSetup)
    expect(isAnswerCorrect(question, " WORLD ")).toBe(true)
  })

  it("serves the full set in exam mode without a question limit", () => {
    const bank = { parts: [{ partNumber: 1, partTitle: "Part 1", questions: Array.from({ length: 3 }, (_, index) => ({ id: index, question: "Q", answer: "A" })) }] }
    expect(mapBankQuestions(bank, "exam", { ...practiceSetup, mode: "exam" })).toHaveLength(3)
    const flatBank = { questions: Array.from({ length: 5 }, (_, index) => ({ id: index, question: "Q", answer: "A" })) }
    expect(mapBankQuestions(flatBank, "exam", { ...practiceSetup, mode: "exam" })).toHaveLength(5)
  })

  it("formats clock time into HH:MM:SS", () => {
    expect(formatClockTime(0)).toBe("00:00:00")
    expect(formatClockTime(7200)).toBe("02:00:00")
    expect(formatClockTime(3661)).toBe("01:01:01")
    expect(formatClockTime(-5)).toBe("00:00:00")
  })
})
