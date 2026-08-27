import { describe, expect, it } from "vitest"
import { parseQuestionBank, QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"

describe("question bank schema", () => {
  it("validates a standard question bank", () => {
    expect(parseQuestionBank({ questions: [{ id: 1, question: "Question", answer: "A", options: { A: "Answer" } }] }, "/data/bank.json").questions).toHaveLength(1)
  })

  it("includes the source path in malformed-bank errors", () => {
    expect(() => parseQuestionBank({ questions: [{ id: 1, question: "Question" }] }, "/data/bank.json")).toThrow(QuestionBankDataError)
    expect(() => parseQuestionBank({ questions: [{ id: 1, question: "Question" }] }, "/data/bank.json")).toThrow("/data/bank.json")
  })

  it("rejects a multiple-choice answer outside the declared options", () => {
    expect(() => parseQuestionBank({ questions: [{ id: 1, question: "Question", answer: "B", options: { A: "Answer" } }] }, "/data/bank.json")).toThrow("answer")
  })
})
