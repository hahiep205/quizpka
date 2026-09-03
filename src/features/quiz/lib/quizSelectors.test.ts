import { describe, expect, it } from "vitest"
import { getAnsweredCount, getIncorrectQuestions, getQuizStats } from "@/features/quiz/lib/quizSelectors"
import type { Question } from "@/features/quiz/model/quiz.types"

const questions: Question[] = [
  { id: "one", prompt: "One", options: ["A", "B"], correctIndex: 0 },
  { id: "two", prompt: "Two", options: ["A", "B"], correctIndex: 1 },
  { id: "three", prompt: "Three", options: ["A", "B"], correctIndex: 0 },
]

describe("quiz selectors", () => {
  it("includes both incorrect and unanswered questions in retry candidates", () => {
    const answers = { one: 0, two: 0 }
    expect(getAnsweredCount(questions, answers)).toBe(2)
    expect(getIncorrectQuestions(questions, answers).map((question) => question.id)).toEqual(["two", "three"])
  })

  it("calculates result statistics from immutable inputs", () => {
    expect(getQuizStats(questions, { one: 0, two: 0 })).toEqual({
      correct: 1,
      wrong: 1,
      skipped: 1,
      accuracy: 33,
      score10: 3.3,
    })
  })
})
