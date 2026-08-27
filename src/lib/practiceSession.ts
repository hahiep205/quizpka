import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { getSubjectById, type ExamCatalogItem, type SubjectId } from "@/data/subjects"
import type { ToeicScope } from "@/data/toeic"
import { appRoutes, navigate } from "@/app/navigation"
import type { Language } from "@/shared/types/app"

export const PRACTICE_SESSION_KEY = "quizpka-practice-session-v1"

export type PracticeSessionPayload = {
  examId: string
  subjectId: SubjectId
  setup: QuizSetupValues
  lang: Language
  chapterId?: string
  toeicScope?: ToeicScope
}

export function savePracticeSession(payload: PracticeSessionPayload) {
  sessionStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(payload))
}

export function readPracticeSession(): PracticeSessionPayload | null {
  try {
    const raw = sessionStorage.getItem(PRACTICE_SESSION_KEY)
    if (!raw) return null
    return parsePracticeSession(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearPracticeSession() {
  sessionStorage.removeItem(PRACTICE_SESSION_KEY)
}

export function goToPracticeGuest(payload: PracticeSessionPayload) {
  savePracticeSession(payload)
  navigate(appRoutes.practice)
}

export function goHomeFromPractice() {
  clearPracticeSession()
  navigate(appRoutes.home, { hash: "#docs" })
}

export function parsePracticeSession(value: unknown): PracticeSessionPayload | null {
  if (!isRecord(value) || typeof value.examId !== "string" || typeof value.subjectId !== "string" || !isRecord(value.setup)) return null
  const setup = value.setup
  if ((value.lang !== "en" && value.lang !== "vi") || !isQuizSetupValues(setup)) return null
  if (!getSubjectById(value.subjectId)) return null
  return {
    examId: value.examId,
    subjectId: value.subjectId as SubjectId,
    setup,
    lang: value.lang,
    chapterId: typeof value.chapterId === "string" ? value.chapterId : undefined,
    toeicScope: isToeicScope(value.toeicScope) ? value.toeicScope : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isQuizSetupValues(value: Record<string, unknown>): value is QuizSetupValues {
  return (value.mode === "practice" || value.mode === "exam")
    && (value.questionOrder === "original" || value.questionOrder === "random")
    && (value.answerOrder === "original" || value.answerOrder === "random")
    && typeof value.timed === "boolean"
    && typeof value.durationMinutes === "number"
    && (value.questionLimit === undefined || typeof value.questionLimit === "number")
}

function isToeicScope(value: unknown): value is ToeicScope {
  return typeof value === "string" && ["full", "listening", "reading", "part1", "part2", "part3", "part4", "part5", "part6", "part7"].includes(value)
}

export type { ExamCatalogItem, QuizSetupValues }
