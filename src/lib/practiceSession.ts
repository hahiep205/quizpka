import type { QuizSetupValues } from "@/components/QuizSetupModal"
import type { ExamCatalogItem } from "@/data/subjects"
import type { ToeicScope } from "@/data/toeic"

export const PRACTICE_SESSION_KEY = "quizpka-practice4guest"

export type PracticeSessionPayload = {
  examId: string
  subjectId: string
  setup: QuizSetupValues
  lang: "en" | "vi"
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
    return JSON.parse(raw) as PracticeSessionPayload
  } catch {
    return null
  }
}

export function clearPracticeSession() {
  sessionStorage.removeItem(PRACTICE_SESSION_KEY)
}

export function goToPracticeGuest(payload: PracticeSessionPayload) {
  savePracticeSession(payload)
  window.location.assign("/practice4guest")
}

export function goHomeFromPractice() {
  clearPracticeSession()
  window.location.assign("/#docs")
}

export type { ExamCatalogItem, QuizSetupValues }
