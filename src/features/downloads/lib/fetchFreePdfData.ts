import { hasChapterSupport, filterQuestionsBySubjectChapter } from "@/data/subjectChapters"
import type { ExamCatalogItem, Subject } from "@/data/subjects"
import { parseQuestionBank, QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"
import type { BankFile, BankQuestion } from "@/features/quiz/model/quiz.types"

export type PdfQuestion = {
  index: number
  prompt: string
  options: { key: string; text: string }[]
  answer: string
  explanation: string | null
  chapter: string | null
  imageUrl: string | null
}

async function fetchBank(url: string): Promise<BankFile> {
  const res = await fetch(url)
  if (!res.ok) throw new QuestionBankDataError(url, `HTTP ${res.status}`)
  const json = await res.json()
  return parseQuestionBank(json, url)
}

function combineQuestions(banks: BankFile[]): BankQuestion[] {
  return banks.flatMap((bank, bankIndex) => {
    // TADV and some banks use parts (partNumber/partTitle/questions)
    if (bank.parts?.length) {
      return bank.parts.flatMap((part) =>
        part.questions.map((q) => ({
          ...q,
          id: `${bankIndex}-${String(q.id)}`,
          // keep part context for PDF chapter label
          chapter: (q as BankQuestion).chapter ?? part.partTitle,
        }))
      )
    }
    return (bank.questions ?? []).map((q) => ({ ...q, id: `${bankIndex}-${String(q.id)}` }))
  })
}

function toWebImagePath(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null
  if (/^(https?:)?\/\//.test(value) || value.startsWith("/")) return value
  return `/data/${value}`
}

export async function fetchQuestionsForPdf(
  subject: Subject,
  exam: ExamCatalogItem,
  chapterId: string,
  signal?: AbortSignal
): Promise<PdfQuestion[]> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  let bankQuestions: BankQuestion[] = []

  // TADV and other free banks use questionBanks / questionBank fields
  const urls = exam.questionBanks?.length ? exam.questionBanks : exam.questionBank ? [exam.questionBank] : []

  if (urls.length) {
    const banks = await Promise.all(urls.map((u) => fetchBank(u)))
    bankQuestions = combineQuestions(banks)
  } else {
    // Fallback: try to load via subject's first exam banks if present (should not happen for free)
    throw new QuestionBankDataError(exam.id, "No question bank configured for PDF export")
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

  // Filter by chapter like quiz does
  let filtered = bankQuestions
  if (chapterId && chapterId !== "all" && hasChapterSupport(subject.id)) {
    filtered = filterQuestionsBySubjectChapter(subject.id, bankQuestions, chapterId)
  }
  if (!filtered.length) throw new QuestionBankDataError(exam.id, "Selected part contains no questions")

  // Map to PdfQuestion preserving original order and answer key
  return filtered.map((item, idx) => {
    const optionKeys = Object.keys(item.options ?? {}).sort()
    const options = optionKeys.map((k) => ({ key: k, text: String(item.options?.[k] ?? "") }))
    const explanation = item.explainAnswer ?? item.explanation ?? item.explain_answer ?? item.explanation_text ?? item.reason ?? null
    const imageUrl = toWebImagePath((item as Record<string, unknown>).imageUrl) ?? toWebImagePath((item as Record<string, unknown>).image) ?? null
    return {
      index: idx + 1,
      prompt: item.question,
      options,
      answer: item.answer,
      explanation,
      chapter: item.chapter ?? null,
      imageUrl,
    }
  })
}
