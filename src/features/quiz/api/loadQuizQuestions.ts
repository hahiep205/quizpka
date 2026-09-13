import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { filterQuestionsBySubjectChapter, hasChapterSupport } from "@/data/subjectChapters"
import type { ExamPaper, Subject } from "@/data/subjects"
import type { ToeicScope } from "@/data/toeic"
import { buildFallbackQuestions, mapBankQuestions } from "@/features/quiz/lib/quizHelpers"
import { parseQuestionBank, QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"
import { loadToeicQuestions } from "@/features/quiz/lib/toeicHelpers"
import type { BankFile, BankPart, Question } from "@/features/quiz/model/quiz.types"
import { supabase } from "@/lib/supabase"

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
  // General banks (questions rather than parts) are merged into one list.
  // Prefix each question id with its bank index so duplicate source ids across
  // split files never collide in the quiz UI.
  const questions = banks.flatMap((bank, bankIndex) =>
    (bank.questions ?? []).map((question) => ({
      ...question,
      id: `${bankIndex}-${question.id}`,
    }))
  )
  return { parts: parts.length ? parts : undefined, questions: questions.length ? questions : undefined }
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
  } else if (subject.id === "khoa-hoc-du-lieu-va-tri-tue-nhan-tao" || subject.id === "nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao" || subject.id === "danh-gia-va-kiem-dinh-chat-luong-phan-mem" || subject.id === "bao-mat-ung-dung-he-thong" || subject.id === "marketing-can-ban" || subject.id === "kinh-te-vi-mo-macro" || subject.id === "tin-hoc-van-phong" || subject.id === "nguyen-ly-tai-chinh" || subject.id === "lich-su-van-minh-the-gioi" || subject.id === "kinh-te-hoc" || subject.id === "phap-luat-dai-cuong" || subject.id === "tu-tuong-ho-chi-minh" || subject.id === "quan-tri-hoc" || subject.id === "kinh-te-chinh-tri-mac-lenin" || subject.id === "lich-su-dang-cong-san-viet-nam" || subject.id === "triet-hoc-mac-lenin-2tc" || subject.id === "triet-hoc-mac-lenin-3tc" || subject.id === "chu-nghia-xa-hoi-khoa-hoc" || subject.id === "toan-roi-rac" || subject.id === "tieng-anh-1" || subject.id === "phuong-phap-nghien-cuu-khoa-hoc" || subject.id === "nghien-cuu-khoa-hoc-trong-kinh-te" || subject.id === "tadv-traphi") {
    const { data, error } = await supabase.functions.invoke("get-paid-question-bank", { body: { examId: exam.id, subjectId: subject.id } })
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (error) throw new QuestionBankDataError(exam.id, error.message)
    const bank = parseQuestionBank(data, exam.id)
    const filteredBank = chapterId && chapterId !== "all" && bank.questions && hasChapterSupport(subject.id)
      ? { ...bank, questions: filterQuestionsBySubjectChapter(subject.id, bank.questions, chapterId) }
      : bank
    questions = mapBankQuestions(filteredBank, exam.id, setup)
  } else if (exam.questionBanks?.length || exam.questionBank) {
    const urls = exam.questionBanks?.length ? exam.questionBanks : [exam.questionBank!]
    const banks = await Promise.all(urls.map((url) => fetchBank(url, signal)))
    const combined = combineBanks(banks)
    if (combined.questions?.length) {
      const filteredQuestions = chapterId && chapterId !== "all" && hasChapterSupport(subject.id)
        ? filterQuestionsBySubjectChapter(subject.id, combined.questions, chapterId)
        : combined.questions
      if (!filteredQuestions.length) {
        throw new QuestionBankDataError(exam.questionBank ?? exam.id, "selected chapter contains no questions")
      }
      questions = mapBankQuestions({ ...combined, questions: filteredQuestions }, exam.id, setup)
    } else {
      questions = mapBankQuestions(combined, exam.id, setup)
    }
  } else {
    questions = buildFallbackQuestions(exam, setup)
  }
  if (!questions.length) throw new QuestionBankDataError(exam.id, "bank contains no questions")
  return questions
}
