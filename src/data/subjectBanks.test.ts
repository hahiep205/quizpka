/// <reference types="node" />
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { subjects, type ExamPaper } from "@/data/subjects"
import { filterQuestionsBySubjectChapter, hasChapterSupport } from "@/data/subjectChapters"

const publicDataRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/data")

type BankQuestion = { id: number | string; chapter?: string }

function bankPaths(exam: ExamPaper): string[] {
  return exam.questionBanks?.length ? exam.questionBanks : exam.questionBank ? [exam.questionBank] : []
}

function bankFile(bankPath: string): string {
  return join(publicDataRoot, bankPath.replace(/^\/data\//, ""))
}

function loadBank(bankPath: string): unknown {
  return JSON.parse(readFileSync(bankFile(bankPath), "utf8"))
}

function countBankQuestions(bank: unknown): number {
  if (Array.isArray(bank)) {
    // TOEIC Part 1/2/5 are bare question arrays; Part 3/4/6 are arrays of groups.
    return bank.reduce((total, item) => {
      const questions = (item as { questions?: unknown })?.questions
      return total + (Array.isArray(questions) ? questions.length : 1)
    }, 0)
  }
  if (!bank || typeof bank !== "object") return 0
  const value = bank as Record<string, unknown>
  if (Array.isArray(value.questions)) return value.questions.length
  if (Array.isArray(value.parts)) {
    return value.parts.reduce((total, part) => total + ((part as { questions?: unknown[] })?.questions?.length ?? 0), 0)
  }
  if (Array.isArray(value.groups)) {
    return value.groups.reduce((total, group) => total + ((group as { questions?: unknown[] })?.questions?.length ?? 0), 0)
  }
  return 0
}

function combineChapterBanks(questionsPerBank: BankQuestion[][]): BankQuestion[] {
  return questionsPerBank.flatMap((questions, bankIndex) =>
    questions.map((question) => ({ ...question, id: `${bankIndex}-${question.id}` }))
  )
}

describe("subject bank metadata matches real data files", () => {
  it("ensures every declared bank path exists under public/data", () => {
    const missing: string[] = []
    for (const subject of subjects) {
      for (const exam of subject.exams) {
        for (const bankPath of bankPaths(exam)) {
          if (!existsSync(bankFile(bankPath))) missing.push(`${subject.id}: ${bankPath}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("matches declared chapter counts for every chapter-based subject", () => {
    for (const subject of subjects.filter((item) => hasChapterSupport(item.id))) {
      for (const exam of subject.exams) {
        const paths = bankPaths(exam)
        if (!paths.length) continue
        const combined = combineChapterBanks(
          paths.map((path) => {
            const bank = loadBank(path) as { questions?: BankQuestion[] }
            if (!bank.questions) throw new Error(`${subject.id}: expected top-level questions in ${path}`)
            return bank.questions
          })
        )
        for (const chapter of subject.chapters ?? []) {
          const actual = filterQuestionsBySubjectChapter(subject.id, combined, chapter.id).length
          expect(actual, `${subject.id} chapter "${chapter.id}" mismatch`).toBe(chapter.count)
        }
        expect(combined.length, `${subject.id} total bank questions`).toBe(exam.questionCount)
      }
    }
  })

  it("matches declared question counts for part-based and plain banks (TOEIC, TADV, Security)", () => {
    for (const subject of subjects.filter((item) => !hasChapterSupport(item.id))) {
      for (const exam of subject.exams) {
        const paths = bankPaths(exam)
        if (!paths.length) continue
        const actual = paths.reduce((total, path) => total + countBankQuestions(loadBank(path)), 0)
        expect(actual, `${subject.id} exam "${exam.id}" question count`).toBe(exam.questionCount)
      }
    }
  })
})