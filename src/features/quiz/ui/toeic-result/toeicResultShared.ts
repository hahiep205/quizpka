import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"
import { isAnswerCorrect } from "@/features/quiz/lib/quizHelpers"
import { toeicResultCopy } from "@/shared/i18n"

export type ToeicResultCopy = (typeof toeicResultCopy)["en" | "vi"]

export type ToeicAnswerStatus = "correct" | "wrong" | "skipped"

export function getToeicAnswerStatus(question: Question, answers: Record<string, AnswerValue>): ToeicAnswerStatus {
  const answer = answers[question.id]
  if (answer === undefined) return "skipped"
  return isAnswerCorrect(question, answer) ? "correct" : "wrong"
}

/** Converts a stored answer to its display letter (number index) or raw text value. */
export function getAnswerLabel(answer: AnswerValue | undefined): string {
  if (answer === undefined) return ""
  return typeof answer === "number" ? String.fromCharCode(65 + answer) : String(answer)
}
