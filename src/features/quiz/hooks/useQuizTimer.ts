import { useCallback, useEffect, useRef, useState } from "react"

type UseQuizTimerInput = {
  isRunning: boolean
  timed: boolean
  durationMinutes: number
  onTimeout: () => void
}

/**
 * Countdown (timed) or stopwatch (untimed) for a quiz session.
 * - No side effects inside state updaters (StrictMode-safe).
 * - `onTimeout` fires exactly once when the countdown reaches zero.
 * - Changing `durationMinutes` mid-session resets the timer to the new duration.
 */
export function useQuizTimer({ isRunning, timed, durationMinutes, onTimeout }: UseQuizTimerInput) {
  const durationSeconds = timed ? durationMinutes * 60 : 0
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const reset = useCallback(() => {
    setSecondsLeft(durationSeconds)
    setElapsedSeconds(0)
  }, [durationSeconds])

  // Re-apply the configured duration whenever it changes (mount included).
  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((elapsed) => elapsed + 1)
      if (timed) setSecondsLeft((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, timed])

  const timeoutHandled = useRef(false)

  // Fire timeout exactly once when the countdown reaches zero.
  useEffect(() => {
    if (!timed || !isRunning || secondsLeft > 0) return
    if (timeoutHandled.current) return
    timeoutHandled.current = true
    onTimeout()
  }, [isRunning, onTimeout, secondsLeft, timed])

  // Re-arm the guard whenever the timer is (re)started from its full duration.
  useEffect(() => {
    if (isRunning && secondsLeft === durationSeconds) timeoutHandled.current = false
  }, [durationSeconds, isRunning, secondsLeft])

  return { secondsLeft, elapsedSeconds, reset }
}
