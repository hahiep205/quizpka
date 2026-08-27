import { useCallback, useEffect, useState } from "react"

export type RetryAttempt = { correct: number; total: number; accuracy: number }

export function useRetryHistory(storageKey: string) {
  const [history, setHistory] = useState<RetryAttempt[]>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      setHistory(Array.isArray(parsed) ? parsed.filter(isRetryAttempt) : [])
    } catch {
      setHistory([])
    }
  }, [storageKey])

  useEffect(() => {
    try {
      if (history.length > 0) sessionStorage.setItem(storageKey, JSON.stringify(history))
      else sessionStorage.removeItem(storageKey)
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, [history, storageKey])

  const clear = useCallback(() => setHistory([]), [])
  return { history, setHistory, clear }
}

function isRetryAttempt(value: unknown): value is RetryAttempt {
  return typeof value === "object" && value !== null
    && typeof (value as RetryAttempt).correct === "number"
    && typeof (value as RetryAttempt).total === "number"
    && typeof (value as RetryAttempt).accuracy === "number"
}
