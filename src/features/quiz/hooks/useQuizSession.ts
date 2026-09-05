import { useCallback, useRef, useState } from "react"
import { createQuizSession, enqueueQuizSessionSubmission, getQuizSession, submitQuizSession, type QuizSessionResponse, type QuizSessionResult } from "@/features/quiz/api/quizSessionApi"

export function useQuizSession() {
  const [session, setSession] = useState<QuizSessionResponse | null>(null)
  const [result, setResult] = useState<QuizSessionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [submissionPending, setSubmissionPending] = useState(false)
  const idempotencyKeyRef = useRef<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

  const start = useCallback(async (examId: string) => {
    setLoading(true)
    setError(null)
    const key = idempotencyKeyRef.current ?? `${crypto.randomUUID()}-${Date.now().toString(36)}`
    idempotencyKeyRef.current = key
    setIdempotencyKey(key)
    try {
      const nextSession = await createQuizSession(examId, key)
      setSession(nextSession)
      if (nextSession.result) setResult(nextSession.result)
      return nextSession
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      setError(nextError)
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [])

  const submit = useCallback(async (answers: Record<string, number | string>) => {
    if (!session || !idempotencyKeyRef.current) throw new Error("Quiz session is not ready")
    setLoading(true)
    setError(null)
    try {
      const nextResult = await submitQuizSession(session.sessionId, answers, idempotencyKeyRef.current)
      setResult(nextResult)
      setSubmissionPending(false)
      return nextResult
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      try {
        await enqueueQuizSessionSubmission(session.sessionId, answers, idempotencyKeyRef.current)
        setSubmissionPending(true)
        setError(new Error("Submission queued for retry"))
      } catch {
        setError(nextError)
        throw nextError
      }
      throw new Error("Submission queued for retry")
    } finally {
      setLoading(false)
    }
  }, [session])

  const resume = useCallback(async (sessionId: string, idempotencyKey?: string) => {
    setLoading(true)
    setError(null)
    if (idempotencyKey) {
      idempotencyKeyRef.current = idempotencyKey
      setIdempotencyKey(idempotencyKey)
    }
    try {
      const current = await getQuizSession(sessionId)
      setSession((previous) => previous ? { ...previous, ...current } : current)
      if (current.result) setResult(current.result)
      return current
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      setError(nextError)
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    session,
    result,
    loading,
    error,
    submissionPending,
    idempotencyKey,
    start,
    submit,
    resume,
  }
}
