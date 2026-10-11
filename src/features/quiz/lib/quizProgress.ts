import type { QuizSetupValues } from "@/components/QuizSetupModal"
import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"
import type { ToeicScope } from "@/data/toeic"

/**
 * Autosave bài đang làm dở vào localStorage để F5/tắt tab/mất mạng mở lại
 * vẫn tiếp tục được. Chỉ xóa khi nộp bài, hết giờ, hoặc user thoát hẳn.
 * Lưu đáp án user đã chọn (index) — không lưu đáp án đúng nên không lộ đề.
 */

const PROGRESS_PREFIX = "quizpka-progress-v1"
const PROGRESS_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type QuizProgressKey = {
  userId: string
  subjectId: string
  examId: string
  chapterId?: string
  toeicScope?: ToeicScope
  mode: QuizSetupValues["mode"]
}

export type HardProgress = {
  queueIds: string[]
  pos: number
  mastered: number
  wrongCounts: Record<string, number>
  finalAnswers: Record<string, AnswerValue>
  /** Answer tapped but not yet submitted with Next (restored as preselected). */
  pendingId?: string
  pendingAnswer?: AnswerValue
}

export type QuizProgress = {
  version: 1
  answers: Record<string, AnswerValue>
  currentIndex: number
  /** Elapsed seconds + wall-clock timestamp (timed mode keeps running while away). */
  elapsedSeconds: number
  savedAt: number
  timed: boolean
  /** Exact order of question ids (supports resume with shuffled order). */
  orderedIds: string[]
  /** Sorted id set — must equal the loaded set or the record is discarded. */
  sortedIds: string[]
  hard?: HardProgress
}

function progressStorageKey(key: QuizProgressKey): string {
  return [
    PROGRESS_PREFIX,
    key.userId,
    key.subjectId,
    key.examId,
    key.chapterId ?? "-",
    key.toeicScope ?? "-",
    key.mode,
  ].join(":")
}

/** Full storage key (used to tell records of different identities apart). */
export function progressStorageKeyString(key: QuizProgressKey): string {
  return progressStorageKey(key)
}

export function sortedQuestionIds(questions: Pick<Question, "id">[]): string[] {
  return questions.map((q) => q.id).sort()
}

/** The saved record only applies when it describes the same question set. */
export function isMatchingProgress(saved: QuizProgress, questions: Pick<Question, "id">[]): boolean {
  if (!saved || saved.version !== 1 || !Array.isArray(saved.sortedIds)) return false
  const current = sortedQuestionIds(questions)
  return saved.sortedIds.length === current.length && saved.sortedIds.every((id, i) => id === current[i])
}

/** Resume offset: timed clock keeps running on wall-clock while away. */
export function resumeElapsedSeconds(saved: QuizProgress, now: number = Date.now()): number {
  if (!saved.timed) return Math.max(0, saved.elapsedSeconds)
  const awaySeconds = Math.max(0, Math.floor((now - saved.savedAt) / 1000))
  return saved.elapsedSeconds + awaySeconds
}

export function saveQuizProgress(key: QuizProgressKey, progress: Omit<QuizProgress, "version" | "savedAt">): void {
  try {
    const record: QuizProgress = { ...progress, version: 1, savedAt: Date.now() }
    localStorage.setItem(progressStorageKey(key), JSON.stringify(record))
  } catch { /* Progress is best-effort (private mode / quota). */ }
}

export function loadQuizProgress(key: QuizProgressKey): QuizProgress | null {
  try {
    const raw = localStorage.getItem(progressStorageKey(key))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<QuizProgress>
    if (!value || value.version !== 1 || typeof value !== "object") return null
    if (typeof value.savedAt !== "number" || Date.now() - value.savedAt > PROGRESS_TTL_MS) {
      localStorage.removeItem(progressStorageKey(key))
      return null
    }
    if (!value.answers || typeof value.answers !== "object" || !Array.isArray(value.orderedIds) || !Array.isArray(value.sortedIds)) return null
    return value as QuizProgress
  } catch {
    return null
  }
}

export function clearQuizProgress(key: QuizProgressKey): void {
  try { localStorage.removeItem(progressStorageKey(key)) } catch { /* noop */ }
}

const SNAPSHOT_SUFFIX = ":snapshot"

/**
 * Full question snapshot saved once per question set so an offline reload
 * (bank fetch fails) can continue without network. Best-effort: quota errors
 * are swallowed and the quiz simply won't resume offline.
 */
export function saveQuestionsSnapshot(key: QuizProgressKey, questions: Question[]): void {
  try {
    localStorage.setItem(progressStorageKey(key) + SNAPSHOT_SUFFIX, JSON.stringify(questions))
  } catch { /* Quota/private mode: offline resume unavailable. */ }
}

export function loadQuestionsSnapshot(key: QuizProgressKey): Question[] | null {
  try {
    const raw = localStorage.getItem(progressStorageKey(key) + SNAPSHOT_SUFFIX)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return null
    return value.filter((q): q is Question => Boolean(q && typeof q === "object" && typeof (q as Question).id === "string" && typeof (q as Question).prompt === "string" && Array.isArray((q as Question).options)))
  } catch {
    return null
  }
}

export function clearQuestionsSnapshot(key: QuizProgressKey): void {
  try { localStorage.removeItem(progressStorageKey(key) + SNAPSHOT_SUFFIX) } catch { /* noop */ }
}
