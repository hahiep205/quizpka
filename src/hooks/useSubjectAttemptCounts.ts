import { useEffect, useState } from "react"
import {
  getCachedSubjectAttemptCounts,
  loadSubjectAttemptCounts,
  subscribeSubjectAttemptCounts,
} from "@/lib/subjectAttemptStats"

export function useSubjectAttemptCounts() {
  const [counts, setCounts] = useState<Record<string, number>>(getCachedSubjectAttemptCounts)

  useEffect(() => {
    const unsubscribe = subscribeSubjectAttemptCounts(setCounts)
    void loadSubjectAttemptCounts()

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void loadSubjectAttemptCounts()
    }
    document.addEventListener("visibilitychange", refreshIfVisible)
    window.addEventListener("focus", refreshIfVisible)

    return () => {
      unsubscribe()
      document.removeEventListener("visibilitychange", refreshIfVisible)
      window.removeEventListener("focus", refreshIfVisible)
    }
  }, [])

  return counts
}
