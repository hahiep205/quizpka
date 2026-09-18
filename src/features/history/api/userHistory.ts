import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { readPracticeHistory, type PracticeHistoryItem } from "@/lib/practiceSession"
import { submitClientReportedAttempt } from "@/features/activity/lib/activityLog"
import { getSubjectById } from "@/data/subjects"

type ServerAttemptRow = {
  history_id: string
  user_id: string
  exam_id: string | null
  subject_id: string | null
  title: string | null
  mode: string | null
  score: number | string | null
  correct: number | null
  total: number | null
  accuracy: number | null
  duration_seconds: number | null
  completed_at: string | null
  retry_of: string | null
  retry_number: number | null
  setup: Record<string, unknown> | null
  lang: string | null
  chapter_id: string | null
  toeic_scope: string | null
  wrong_questions: Array<Record<string, unknown>> | null
}

function asSetup(value: unknown): PracticeHistoryItem["setup"] {
  const v = (value ?? {}) as Record<string, unknown>
  return {
    mode: v.mode === "exam" || v.mode === "hard" ? v.mode : "practice",
    questionOrder: v.questionOrder === "random" ? "random" : "original",
    answerOrder: v.answerOrder === "random" ? "random" : "original",
    timed: v.timed === true,
    durationMinutes: typeof v.durationMinutes === "number" ? v.durationMinutes : 30,
  }
}

function asWrongQuestions(value: unknown): PracticeHistoryItem["wrongQuestions"] {
  if (!Array.isArray(value)) return undefined
  const out = value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .slice(0, 200)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      prompt: typeof item.prompt === "string" ? item.prompt.slice(0, 2000) : "",
      correctAnswer: typeof item.correctAnswer === "string" ? item.correctAnswer.slice(0, 500) : "",
      wasSkipped: item.wasSkipped === true,
    }))
    .filter((item) => item.id)
  return out.length ? out : undefined
}

/** Lịch sử của chính user, đọc từ server để đồng bộ mọi thiết bị. */
export async function fetchUserHistory(userId: string, limit = 100): Promise<PracticeHistoryItem[]> {
  const { data, error } = await supabase
    .from("practice_attempts")
    .select("history_id,user_id,exam_id,subject_id,title,mode,score,correct,total,accuracy,duration_seconds,completed_at,retry_of,retry_number,setup,lang,chapter_id,toeic_scope,wrong_questions")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as ServerAttemptRow[]
  const out: PracticeHistoryItem[] = []
  for (const r of rows) {
    if (!r.history_id || !r.exam_id || !r.subject_id) continue
    if (!getSubjectById(r.subject_id)) continue
    out.push({
      id: r.history_id,
      userId: r.user_id,
      examId: r.exam_id,
      subjectId: r.subject_id as PracticeHistoryItem["subjectId"],
      title: r.title || r.exam_id,
      mode: r.mode || "practice",
      score: Number(r.score) || 0,
      correct: r.correct ?? 0,
      total: r.total ?? 0,
      accuracy: r.accuracy ?? 0,
      durationSeconds: r.duration_seconds ?? 0,
      completedAt: r.completed_at || new Date().toISOString(),
      setup: asSetup(r.setup),
      lang: r.lang === "en" ? "en" : "vi",
      chapterId: r.chapter_id || undefined,
      toeicScope: (r.toeic_scope as PracticeHistoryItem["toeicScope"]) || undefined,
      retryOfHistoryId: r.retry_of || undefined,
      retryNumber: typeof r.retry_number === "number" ? r.retry_number : undefined,
      wrongQuestions: asWrongQuestions(r.wrong_questions),
    })
  }
  return out
}

/**
 * Lịch sử đồng bộ đa thiết bị: server là nguồn thật.
 * Merge thêm bài local chưa kịp lên server (hiển thị ngay) và backfill 1 lần.
 */
export function useSyncedHistory(userId: string | undefined, userCreatedAt?: string) {
  const [history, setHistory] = useState<PracticeHistoryItem[]>(() =>
    userId ? readPracticeHistory(userId, userCreatedAt) : [],
  )
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setHistory([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const local = readPracticeHistory(userId, userCreatedAt)
    void fetchUserHistory(userId, 100)
      .then((server) => {
        if (cancelled) return
        const serverIds = new Set(server.map((item) => item.id))
        const missing = local.filter((item) => !serverIds.has(item.id))
        setHistory([...missing, ...server].slice(0, 100))
        setError(null)
        // Backfill bài local cũ lên server để các thiết bị khác thấy (best-effort).
        for (const item of missing.slice(0, 20)) {
          void submitClientReportedAttempt({
            historyId: item.id,
            examId: item.examId,
            subjectId: item.subjectId,
            title: item.title,
            mode: item.mode,
            score: item.score,
            correct: item.correct,
            total: item.total,
            accuracy: item.accuracy,
            durationSeconds: item.durationSeconds,
            retryOf: item.retryOfHistoryId,
            retryNumber: item.retryNumber,
            setup: item.setup as unknown as Record<string, unknown>,
            lang: item.lang,
            chapterId: item.chapterId,
            toeicScope: item.toeicScope,
            wrongQuestions: (item.wrongQuestions ?? []) as unknown as Array<Record<string, unknown>>,
          }).catch(() => undefined)
        }
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return
        // Rớt mạng: dùng cache local để không trắng màn hình.
        setHistory(local)
        setError(fetchError instanceof Error ? fetchError.message : "Không tải được lịch sử.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, userCreatedAt])

  return { history, loading, error }
}
