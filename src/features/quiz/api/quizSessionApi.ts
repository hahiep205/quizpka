import { supabase } from "@/lib/supabase"
import type { Question } from "@/features/quiz/model/quiz.types"

export type QuizSessionResponse = {
  sessionId: string
  examId: string
  subjectId: string
  startedAt: string
  expiresAt: string
  status: "active" | "submitted" | "expired" | "abandoned"
  questions: Question[] | null
  result?: QuizSessionResult | null
}

export type QuizSessionResult = {
  sessionId: string
  attemptId: string
  correct: number
  total: number
  accuracy: number
  score: number
  durationSeconds: number
  expired: boolean
  questions: Array<{
    id: string
    selectedAnswer: number | string | null
    correctAnswer: number | null
    isCorrect: boolean
  }>
}

export class QuizSessionApiError extends Error {
  readonly status: number | undefined
  readonly sessionId: string | undefined

  constructor(message: string, status?: number, sessionId?: string) {
    super(message)
    this.name = "QuizSessionApiError"
    this.status = status
    this.sessionId = sessionId
  }
}

function newIdempotencyKey() {
  return `${crypto.randomUUID()}-${Date.now().toString(36)}`
}

async function invoke<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  if (error) {
    let message = error.message
    const context = "context" in error && error.context instanceof Response ? error.context : undefined
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: unknown; message?: unknown }
          if (typeof payload.error === "string") message = payload.error
        else if (typeof payload.message === "string") message = payload.message
      } catch {
        // Keep the SDK error when the function did not return JSON.
      }
      let sessionId: string | undefined
      try {
        const payload = await context.clone().json() as { sessionId?: unknown }
        sessionId = typeof payload.sessionId === "string" ? payload.sessionId : undefined
      } catch {
        // No structured recovery data.
      }
      throw new QuizSessionApiError(message, context.status, sessionId)
    }
    if (error.name === "FunctionsRelayError") message = `${message} (Edge Function unavailable)`
    throw new QuizSessionApiError(message)
  }
  return data as T
}

export function createQuizSession(examId: string, idempotencyKey = newIdempotencyKey()) {
  return invoke<QuizSessionResponse>("create-quiz-session", { examId, idempotencyKey })
}

export function submitQuizSession(sessionId: string, answers: Record<string, number | string>, idempotencyKey: string) {
  return invoke<QuizSessionResult>("submit-quiz-session", { sessionId, answers, idempotencyKey })
}

export async function enqueueQuizSessionSubmission(
  sessionId: string,
  answers: Record<string, number | string>,
  idempotencyKey: string,
) {
  // P1: dùng getSession (đọc local, không tốn 1 hit GET /auth/v1/user).
  // getUser() trước đây mỗi lần submit lại gọi Auth server — script spam
  // submit là cháy quota. JWT vẫn được Edge Function/RPC verify server-side.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (sessionError || !user) throw new QuizSessionApiError("Authentication required")
  const { data, error } = await supabase.rpc("enqueue_attempt_submission", {
    p_session_id: sessionId,
    p_user_id: user.id,
    p_idempotency_key: idempotencyKey,
    p_answers: answers,
  })
  if (error) throw new QuizSessionApiError(error.message)
  return data as string
}

export function getQuizSession(sessionId: string) {
  return invoke<QuizSessionResponse>("get-quiz-session", { sessionId })
}
