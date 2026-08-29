import { describe, expect, it } from "vitest"
import type { Question } from "@/features/quiz/model/quiz.types"
import { getToeicResultStats, buildPartRanges } from "@/features/quiz/lib/toeicResultStats"

function mk(id: string, partTitle: string, section: "Listening" | "Reading", correctIndex: number): Question {
  return { id, prompt: "Q", options: ["A", "B", "C", "D"], correctIndex, partTitle, section, questionType: "question_response" }
}

const questions: Question[] = [
  mk("q1", "Listening - Part 2 - Q7", "Listening", 0),
  mk("q2", "Listening - Part 2 - Q8", "Listening", 1),
  mk("q3", "Reading - Part 5 - Q1", "Reading", 2),
  mk("q4", "Reading - Part 5 - Q2", "Reading", 3),
]

describe("TOEIC result stats", () => {
  it("aggregates totals, sections, parts and categories", () => {
    // q1: correct (A), q2: wrong (chose A but correct is B), q3: skipped, q4: correct (D)
    const answers = { q1: 0, q2: 0, q4: 3 }
    const stats = getToeicResultStats(questions, answers)

    expect(stats.total).toMatchObject({ correct: 2, wrong: 1, skipped: 1, total: 4, accuracy: 67 })
    expect(stats.listening).toMatchObject({ correct: 1, wrong: 1, skipped: 0, total: 2 })
    expect(stats.reading).toMatchObject({ correct: 1, wrong: 0, skipped: 1, total: 2 })

    expect(stats.sectionScores.listening).toBe(250) // 5 + 490 * 0.5
    expect(stats.sectionScores.reading).toBe(250)
    expect(stats.sectionScores.total).toBe(500)

    expect(stats.parts.map((p) => p.partNum)).toEqual([2, 5])
    const part2 = stats.parts.find((p) => p.partNum === 2)!
    expect(part2).toMatchObject({ correct: 1, wrong: 1, skipped: 0, total: 2 })

    const categories = stats.categories
    expect(categories.length).toBeGreaterThan(0)
    const part2Row = categories.find((c) => c.partNum === 2)!
    expect(part2Row.key).toBe("question_response")
    expect(part2Row.questionIds).toEqual(["q1", "q2"])
  })

  it("builds contiguous part ranges from the number map", () => {
    const numberMap = new Map([["q1", 1], ["q2", 2], ["q3", 101], ["q4", 102]])
    const ranges = buildPartRanges(questions, numberMap, { q1: 0, q2: 0, q4: 3 })
    expect(ranges).toHaveLength(2)
    expect(ranges[0]).toMatchObject({ partNum: 2, start: 1, end: 2, count: 2, contiguous: true, correct: 1 })
    expect(ranges[1]).toMatchObject({ partNum: 5, start: 101, end: 102, count: 2, contiguous: true, correct: 1 })
  })

  it("flags non-contiguous ranges when the number map is scattered", () => {
    const numberMap = new Map([["q1", 5], ["q2", 50], ["q3", 8], ["q4", 90]])
    const ranges = buildPartRanges(questions, numberMap, {})
    expect(ranges[0].contiguous).toBe(false)
  })

  it("splits the same category across different parts into separate rows", () => {
    const parts: Question[] = [
      mk("a1", "Listening - Part 1 - Q1", "Listening", 0),
      mk("a2", "Listening - Part 1 - Q2", "Listening", 1),
      mk("b1", "Reading - Part 5 - Q1", "Reading", 0),
    ]
    // both parts classify as the same "action"/grammar bucket -> parts must stay separated
    const stats = getToeicResultStats(parts, {})
    const vocabRows = stats.categories.filter((c) => c.partNum === 1 || c.partNum === 5)
    expect(vocabRows.filter((c) => c.partNum === 1)).toHaveLength(1)
    expect(vocabRows.filter((c) => c.partNum === 5)).toHaveLength(1)
    const row1 = stats.categories.find((c) => c.partNum === 1)!
    expect(row1.questionIds).toEqual(["a1", "a2"])
    const row5 = stats.categories.find((c) => c.partNum === 5)!
    expect(row5.questionIds).toEqual(["b1"])
  })
})
