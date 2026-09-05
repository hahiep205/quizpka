import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { getSubjectById, type SubjectId } from "@/data/subjects"
import type { ToeicScope } from "@/data/toeic"
import { appRoutes, navigate } from "@/app/navigation"
import type { Language } from "@/shared/types/app"

export const PRACTICE_SESSION_KEY = "quizpka-practice-session-v2"
export const PRACTICE_HISTORY_KEY = "quizpka-practice-history-v1"
export type PracticeHistoryItem = {
  id: string
  userId?: string
  examId: string
  subjectId: SubjectId
  title: string
  mode: string
  score: number
  correct: number
  total: number
  accuracy: number
  durationSeconds: number
  completedAt: string
  setup: QuizSetupValues
  lang: Language
  chapterId?: string
  toeicScope?: ToeicScope
  retryOfHistoryId?: string
  retryNumber?: number
  wrongQuestions?: Array<{
    id: string
    prompt: string
    correctAnswer: string
    wasSkipped?: boolean
  }>
}

export function savePracticeHistory(item: PracticeHistoryItem, userId: string): void {
  try {
    const key = `${PRACTICE_HISTORY_KEY}:${userId}`
    const raw = localStorage.getItem(key)
    const history: PracticeHistoryItem[] = raw ? JSON.parse(raw) : []
    localStorage.setItem(key, JSON.stringify([{ ...item, userId }, ...history].slice(0, 100)))
  } catch { /* Storage is optional. */ }
}

export function readPracticeHistory(userId: string, userCreatedAt?: string): PracticeHistoryItem[] {
  try {
    const userKey = `${PRACTICE_HISTORY_KEY}:${userId}`
    const raw = localStorage.getItem(userKey)
    const value: unknown = raw ? JSON.parse(raw) : []
    const parsed = Array.isArray(value) ? value.filter((item): item is PracticeHistoryItem => Boolean(item && typeof item === "object" && typeof item.id === "string")) : []
    const accountCreatedAt = userCreatedAt ? Date.parse(userCreatedAt) : Number.NaN
    const history = parsed.filter((item) => {
      if (item.userId) return item.userId === userId
      if (!Number.isFinite(accountCreatedAt)) return true
      const completedAt = Date.parse(item.completedAt)
      return !Number.isFinite(completedAt) || completedAt >= accountCreatedAt
    })
    if (history.length !== parsed.length) localStorage.setItem(userKey, JSON.stringify(history))
    return history
  } catch { return [] }
}

export type PracticeSessionPayload = {
  examId: string
  subjectId: SubjectId
  setup: QuizSetupValues
  lang: Language
  chapterId?: string
  toeicScope?: ToeicScope
  questionIds?: string[]
  retryOfHistoryId?: string
  retryNumber?: number
}

export function savePracticeSession(payload: PracticeSessionPayload) {
  try { sessionStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(payload)) } catch { /* Session resume is best-effort. */ }
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
  try { sessionStorage.removeItem(PRACTICE_SESSION_KEY) } catch { /* Storage is optional. */ }
}

export function goToPracticeGuest(payload: PracticeSessionPayload) {
  savePracticeSession(payload)
  navigate(appRoutes.practiceGuest)
}

export function goToPractice(payload: PracticeSessionPayload, authenticated: boolean) {
  savePracticeSession(payload)
  navigate(authenticated ? appRoutes.practice : appRoutes.practiceGuest)
}

export function goHomeFromPractice() {
  clearPracticeSession()
  if (window.location.pathname === appRoutes.practice || window.location.pathname === appRoutes.result) navigate(appRoutes.dashboard)
  else navigate(appRoutes.home, { hash: "#docs" })
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
    questionIds: Array.isArray(value.questionIds) ? value.questionIds.filter((id): id is string => typeof id === "string") : undefined,
    retryOfHistoryId: typeof value.retryOfHistoryId === "string" ? value.retryOfHistoryId : undefined,
    retryNumber: typeof value.retryNumber === "number" && Number.isInteger(value.retryNumber) && value.retryNumber > 0
      ? value.retryNumber
      : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isQuizSetupValues(value: Record<string, unknown>): value is QuizSetupValues {
  return (value.mode === "practice" || value.mode === "exam" || value.mode === "hard")
    && (value.questionOrder === "original" || value.questionOrder === "random")
    && (value.answerOrder === "original" || value.answerOrder === "random")
    && typeof value.timed === "boolean"
    && typeof value.durationMinutes === "number"
}

function isToeicScope(value: unknown): value is ToeicScope {
  return typeof value === "string" && ["full", "listening", "reading", "part1", "part2", "part3", "part4", "part5", "part6", "part7"].includes(value)
}


