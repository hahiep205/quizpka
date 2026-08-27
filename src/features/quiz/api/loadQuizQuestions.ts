import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { filterQuestionsBySubjectChapter, hasChapterSupport } from "@/data/subjectChapters"
import type { ExamPaper, Subject } from "@/data/subjects"
import type { ToeicScope } from "@/data/toeic"
import { buildFallbackQuestions, mapBankQuestions } from "@/features/quiz/lib/quizHelpers"
import { parseQuestionBank, QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"
import { loadToeicQuestions } from "@/features/quiz/lib/toeicHelpers"
import type { BankFile, BankPart, Question } from "@/features/quiz/model/quiz.types"

async function fetchBank(url: string, signal: AbortSignal): Promise<BankFile> {
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new QuestionBankDataError(url, `network request failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!response.ok) throw new QuestionBankDataError(url, `request returned HTTP ${response.status}`)
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new QuestionBankDataError(url, "response is not valid JSON")
  }
  return parseQuestionBank(json, url)
}

function combineBanks(banks: BankFile[]): BankFile {
  const parts = banks.flatMap((bank) =>
    (bank.parts ?? []).map((part): BankPart => ({
      ...part,
      section: bank.title?.includes("Nghe") ? "Listening" : "Reading",
    }))
  )
  return { parts }
}

export type LoadQuizQuestionsInput = {
  subject: Subject
  exam: ExamPaper
  setup: QuizSetupValues
  chapterId?: string
  toeicScope?: ToeicScope
  signal: AbortSignal
}

export async function loadQuizQuestions({ subject, exam, setup, chapterId, toeicScope, signal }: LoadQuizQuestionsInput): Promise<Question[]> {
  let questions: Question[]
  if (subject.id === "toeic" && toeicScope) {
    questions = await loadToeicQuestions(toeicScope, exam.id, setup, signal)
  } else if (exam.questionBanks?.length) {
    const banks = await Promise.all(exam.questionBanks.map((url) => fetchBank(url, signal)))
    questions = mapBankQuestions(combineBanks(banks), exam.id, setup)
  } else if (exam.questionBank) {
    const bank = await fetchBank(exam.questionBank, signal)
    const filteredQuestions = chapterId && chapterId !== "all" && hasChapterSupport(subject.id)
      ? filterQuestionsBySubjectChapter(subject.id, bank.questions ?? [], chapterId)
      : bank.questions
    if (bank.questions && !filteredQuestions?.length) throw new QuestionBankDataError(exam.questionBank, "selected chapter contains no questions")
    questions = mapBankQuestions({ ...bank, questions: filteredQuestions }, exam.id, setup)
  } else {
    questions = buildFallbackQuestions(exam, setup)
  }
  if (!questions.length) throw new QuestionBankDataError(exam.id, "bank contains no questions")
  return questions
}
