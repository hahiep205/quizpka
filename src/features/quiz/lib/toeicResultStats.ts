import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"
import { isAnswerCorrect } from "@/features/quiz/lib/quizHelpers"
import { getSectionScores, sectionScore } from "@/features/quiz/lib/toeicScore"
import {
  classifyToeicQuestion,
  getToeicPartNumber,
  TOEIC_CATEGORY_ORDER,
  type ToeicCategoryKey,
} from "@/features/quiz/lib/toeicCategories"
import { buildQuestionNumberMap } from "@/features/quiz/lib/quizGrouping"

export type ToeicCounts = {
  correct: number
  wrong: number
  skipped: number
  total: number
  accuracy: number
}

function addStatus(acc: { correct: number; wrong: number; skipped: number }, status: "correct" | "wrong" | "skipped") {
  if (status === "correct") acc.correct += 1
  else if (status === "wrong") acc.wrong += 1
  else acc.skipped += 1
}

function toCounts(acc: { correct: number; wrong: number; skipped: number }): ToeicCounts {
  const total = acc.correct + acc.wrong + acc.skipped
  return { ...acc, total, accuracy: total === 0 ? 0 : Math.round((acc.correct / total) * 100) }
}

function statusOf(question: Question, answers: Record<string, AnswerValue>): "correct" | "wrong" | "skipped" {
  const answer = answers[question.id]
  if (answer === undefined) return "skipped"
  return isAnswerCorrect(question, answer) ? "correct" : "wrong"
}

export type ToeicPartStat = ToeicCounts & {
  partNum: number
  questionIds: string[]
}

export type ToeicCategoryStat = ToeicCounts & {
  key: ToeicCategoryKey
  partNum: number
  questionIds: string[]
}

export type ToeicPartRange = {
  partNum: number
  start: number
  end: number
  count: number
  contiguous: boolean
  correct: number
}

export type ToeicResultStats = {
  total: ToeicCounts
  listening: ToeicCounts
  reading: ToeicCounts
  sectionScores: { listening: number; reading: number; total: number }
  parts: ToeicPartStat[]
  categories: ToeicCategoryStat[]
  partRanges: ToeicPartRange[]
}

/** Contiguous "Câu N - M" ranges per part, derived from the 1-based number map. */
export function buildPartRanges(questions: Question[], numberMap: Map<string, number>, answers: Record<string, AnswerValue>): ToeicPartRange[] {
  const byPart = new Map<number, { numbers: number[]; correct: number }>()
  for (const question of questions) {
    const partNum = getToeicPartNumber(question) ?? 0
    const entry = byPart.get(partNum) ?? { numbers: [], correct: 0 }
    const number = numberMap.get(question.id) ?? 0
    entry.numbers.push(number)
    if (statusOf(question, answers) === "correct") entry.correct += 1
    byPart.set(partNum, entry)
  }
  return Array.from(byPart.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([partNum, entry]) => {
      const numbers = entry.numbers.sort((a, b) => a - b)
      const start = numbers[0] ?? 0
      const end = numbers[numbers.length - 1] ?? 0
      return {
        partNum,
        start,
        end,
        count: numbers.length,
        contiguous: numbers.length === 0 || end - start + 1 === numbers.length,
        correct: entry.correct,
      }
    })
}

export function getToeicResultStats(questions: Question[], answers: Record<string, AnswerValue>, numberMap?: Map<string, number>): ToeicResultStats {
  const totalAcc = { correct: 0, wrong: 0, skipped: 0 }
  const listeningAcc = { correct: 0, wrong: 0, skipped: 0 }
  const readingAcc = { correct: 0, wrong: 0, skipped: 0 }
  const partAcc = new Map<number, { correct: number; wrong: number; skipped: number; questionIds: string[] }>()
  const categoryAcc = new Map<string, { key: ToeicCategoryKey; correct: number; wrong: number; skipped: number; questionIds: string[]; partNum: number }>()

  for (const question of questions) {
    const status = statusOf(question, answers)
    addStatus(totalAcc, status)
    if (question.section === "Listening") addStatus(listeningAcc, status)
    else if (question.section === "Reading") addStatus(readingAcc, status)

    const partNum = getToeicPartNumber(question) ?? 0
    const partEntry = partAcc.get(partNum) ?? { correct: 0, wrong: 0, skipped: 0, questionIds: [] }
    addStatus(partEntry, status)
    partEntry.questionIds.push(question.id)
    partAcc.set(partNum, partEntry)

    const key = classifyToeicQuestion(question)
    const catKey = `${partNum}:${key}`
    const catEntry = categoryAcc.get(catKey) ?? { key, correct: 0, wrong: 0, skipped: 0, questionIds: [], partNum }
    addStatus(catEntry, status)
    catEntry.questionIds.push(question.id)
    categoryAcc.set(catKey, catEntry)
  }

  const listening = toCounts(listeningAcc)
  const reading = toCounts(readingAcc)
  const sectionScores = getSectionScores(listening.correct, listening.total, reading.correct, reading.total)

  const parts = Array.from(partAcc.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([partNum, entry]) => ({ partNum, ...toCounts(entry), questionIds: entry.questionIds }))

  const categories = Array.from(categoryAcc.values())
    .map((entry) => ({ key: entry.key, partNum: entry.partNum, ...toCounts(entry), questionIds: entry.questionIds }))
    .sort((a, b) => {
      if (a.partNum !== b.partNum) return a.partNum - b.partNum
      return TOEIC_CATEGORY_ORDER.indexOf(a.key) - TOEIC_CATEGORY_ORDER.indexOf(b.key)
    })

  const map = numberMap ?? buildQuestionNumberMap(questions)
  const partRanges = buildPartRanges(questions, map, answers)

  return {
    total: toCounts(totalAcc),
    listening,
    reading,
    sectionScores,
    parts,
    categories,
    partRanges,
  }
}

export { sectionScore }
