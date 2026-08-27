import { useCallback, useEffect, useState } from "react"

type UseQuizTimerInput = {
  isRunning: boolean
  timed: boolean
  durationMinutes: number
  onTimeout: () => void
}

export function useQuizTimer({ isRunning, timed, durationMinutes, onTimeout }: UseQuizTimerInput) {
  const durationSeconds = timed ? durationMinutes * 60 : 0
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const reset = useCallback(() => {
    setSecondsLeft(durationSeconds)
    setElapsedSeconds(0)
  }, [durationSeconds])

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((elapsed) => elapsed + 1)
      if (!timed) return
      setSecondsLeft((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer)
          onTimeout()
          return 0
        }
        return remaining - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, onTimeout, timed])

  return { secondsLeft, elapsedSeconds, reset }
}
