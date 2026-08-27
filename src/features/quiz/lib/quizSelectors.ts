import { isAnswerCorrect } from "@/features/quiz/lib/quizHelpers"
import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"

export type QuizStats = {
  correct: number
  wrong: number
  skipped: number
  accuracy: number
  score10: number
}

export function getAnsweredCount(questions: Question[], answers: Record<string, AnswerValue>): number {
  return questions.filter((question) => answers[question.id] !== undefined).length
}

export function getIncorrectQuestions(questions: Question[], answers: Record<string, AnswerValue>): Question[] {
  return questions.filter((question) => !isAnswerCorrect(question, answers[question.id]))
}

export function getQuizStats(questions: Question[], answers: Record<string, AnswerValue>): QuizStats {
  let correct = 0
  let wrong = 0
  let skipped = 0
  for (const question of questions) {
    const answer = answers[question.id]
    if (answer === undefined) skipped += 1
    else if (isAnswerCorrect(question, answer)) correct += 1
    else wrong += 1
  }
  const attempted = correct + wrong
  return {
    correct,
    wrong,
    skipped,
    accuracy: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
    score10: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100) / 10,
  }
}
