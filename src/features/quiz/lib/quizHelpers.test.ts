import { describe, expect, it } from "vitest"
import { isAnswerCorrect, mapBankQuestions } from "@/features/quiz/lib/quizHelpers"

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

  it("limits exam mode after mapping groups", () => {
    const questions = mapBankQuestions({ parts: [{ partNumber: 1, partTitle: "Part 1", questions: Array.from({ length: 3 }, (_, index) => ({ id: index, question: "Q", answer: "A" })) }] }, "exam", { ...practiceSetup, mode: "exam", questionLimit: 2 })
    expect(questions).toHaveLength(2)
  })
})
