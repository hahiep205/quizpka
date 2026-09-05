import { supabase } from "@/lib/supabase"

export type ActivityEventType =
  | "login"
  | "view_dashboard"
  | "open_exam"
  | "start_attempt"
  | "submit_attempt"
  | "retry_wrong"
  | "view_leaderboard"
  | "update_profile"

export type ActivityEvent = {
  id: number
  userId: string
  eventType: ActivityEventType
  metadata: Record<string, unknown>
  createdAt: string
}

export type PracticeAttemptRow = {
  historyId: string
  userId: string
  examId: string
  subjectId: string
  title: string
  mode: string
  score: number
  correct: number
  total: number
  accuracy: number
  durationSeconds: number
  completedAt: string
  retryOfHistoryId?: string
  retryNumber?: number
}

const SESSION_LOGGED_KEY = "quizpka-activity-session-v1"

function readSessionLogged(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SESSION_LOGGED_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function markSessionLogged(key: string): void {
  try {
    const cur = readSessionLogged()
    cur[key] = Date.now()
    sessionStorage.setItem(SESSION_LOGGED_KEY, JSON.stringify(cur))
  } catch {
    // Logging is best-effort.
  }
}

/**
 * Ghi 1 event hoạt động. Best-effort: không throw, RLS thiếu thì bỏ qua.
 * `oncePerSessionKey` dùng để chống spam event view/login lặp lại.
 */
export function logActivityEvent(
  userId: string | undefined,
  eventType: ActivityEventType,
  metadata: Record<string, unknown> = {},
  options: { oncePerSessionKey?: string } = {},
): void {
  if (!userId) return
  if (options.oncePerSessionKey) {
    const logged = readSessionLogged()
    if (logged[options.oncePerSessionKey]) return
    markSessionLogged(options.oncePerSessionKey)
  }
  void (async () => {
    try {
      await supabase.from("user_activity_events").insert({
        user_id: userId,
        event_type: eventType,
        metadata,
      })
    } catch {
      // Bảng chưa migrate hoặc mất mạng -> bỏ qua, không vỡ UX.
    }
  })()
}

const ATTEMPT_SESSION_PREFIX = "quizpka-attempt-session:"

/**
 * sessionId nối chuỗi open_exam -> start_attempt -> submit_attempt của cùng 1 lượt.
 * Lưu ở sessionStorage để sống qua chuyển trang trong cùng tab.
 */
export function beginAttemptSession(examId: string): string {
  const sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  try {
    sessionStorage.setItem(ATTEMPT_SESSION_PREFIX + examId, sid)
  } catch {
    // ignore
  }
  return sid
}

export function currentAttemptSession(examId: string): string | null {
  try {
    return sessionStorage.getItem(ATTEMPT_SESSION_PREFIX + examId)
  } catch {
    return null
  }
}

/** Đọc + xóa session (dùng khi submit để mỗi lượt chỉ dùng 1 lần). */
export function endAttemptSession(examId: string): string | null {
  try {
    const sid = sessionStorage.getItem(ATTEMPT_SESSION_PREFIX + examId)
    sessionStorage.removeItem(ATTEMPT_SESSION_PREFIX + examId)
    return sid
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

const VALID_EVENTS: ActivityEventType[] = [
  "login", "view_dashboard", "open_exam", "start_attempt",
  "submit_attempt", "retry_wrong", "view_leaderboard", "update_profile",
]

export function parseActivityRows(rows: unknown): ActivityEvent[] {
  if (!Array.isArray(rows)) return []
  const out: ActivityEvent[] = []
  for (const row of rows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue
    const r = row as Record<string, unknown>
    if (typeof r.user_id !== "string" || !r.user_id) continue
    if (typeof r.event_type !== "string" || !VALID_EVENTS.includes(r.event_type as ActivityEventType)) continue
    out.push({
      id: typeof r.id === "number" ? r.id : 0,
      userId: r.user_id,
      eventType: r.event_type as ActivityEventType,
      metadata: asRecord(r.metadata),
      createdAt: typeof r.created_at === "string" ? r.created_at : "",
    })
  }
  return out.sort((a, b) => b.id - a.id)
}

export function parseAttemptRows(rows: unknown): PracticeAttemptRow[] {
  if (!Array.isArray(rows)) return []
  const out: PracticeAttemptRow[] = []
  for (const row of rows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue
    const r = row as Record<string, unknown>
    if (typeof r.user_id !== "string" || !r.user_id) continue
    if (typeof r.history_id !== "string" || !r.history_id) continue
    out.push({
      historyId: r.history_id,
      userId: r.user_id,
      examId: typeof r.exam_id === "string" ? r.exam_id : "",
      subjectId: typeof r.subject_id === "string" ? r.subject_id : "",
      title: typeof r.title === "string" ? r.title : "",
      mode: typeof r.mode === "string" ? r.mode : "",
      score: typeof r.score === "number" ? r.score : Number(r.score) || 0,
      correct: typeof r.correct === "number" ? r.correct : 0,
      total: typeof r.total === "number" ? r.total : 0,
      accuracy: typeof r.accuracy === "number" ? r.accuracy : 0,
      durationSeconds: typeof r.duration_seconds === "number" ? r.duration_seconds : 0,
      completedAt: typeof r.completed_at === "string" ? r.completed_at : "",
      retryOfHistoryId: typeof r.retry_of === "string" ? r.retry_of : undefined,
      retryNumber: typeof r.retry_number === "number" ? r.retry_number : undefined,
    })
  }
  return out
}

export const ACTIVITY_LABELS: Record<ActivityEventType, string> = {
  login: "Đăng nhập",
  view_dashboard: "Xem dashboard",
  open_exam: "Mở đề",
  start_attempt: "Bắt đầu làm",
  submit_attempt: "Nộp bài",
  retry_wrong: "Làm lại câu sai",
  view_leaderboard: "Xem xếp hạng",
  update_profile: "Sửa profile",
}

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toTimelineCsv(events: ActivityEvent[]): string {
  const lines = ["id,user_id,event_type,created_at,metadata"]
  for (const e of events) {
    lines.push([csvCell(e.id), csvCell(e.userId), csvCell(e.eventType), csvCell(e.createdAt), csvCell(JSON.stringify(e.metadata))].join(","))
  }
  return lines.join("\n")
}

export function toAttemptsCsv(attempts: PracticeAttemptRow[]): string {
  const lines = ["history_id,user_id,exam_id,subject_id,title,mode,score,correct,total,accuracy,duration_seconds,retry_of,retry_number,completed_at"]
  for (const a of attempts) {
    lines.push([
      csvCell(a.historyId), csvCell(a.userId), csvCell(a.examId), csvCell(a.subjectId),
      csvCell(a.title), csvCell(a.mode), csvCell(a.score), csvCell(a.correct),
      csvCell(a.total), csvCell(a.accuracy), csvCell(a.durationSeconds),
      csvCell(a.retryOfHistoryId), csvCell(a.retryNumber), csvCell(a.completedAt),
    ].join(","))
  }
  return lines.join("\n")
}
