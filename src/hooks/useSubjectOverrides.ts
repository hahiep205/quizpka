import { useEffect, useState } from "react"
import { fetchSubjectOverrides, type SubjectDisplayOverride } from "@/features/admin/api/subjectOverrides"
import { overrideMapBySubject } from "@/features/admin/lib/subjectDisplay"

// Module-level cache so the homepage, dashboard, detail page and admin share
// one fetch per session instead of one per mounted page.
let cached: Map<string, SubjectDisplayOverride> | null = null
let inflight: Promise<Map<string, SubjectDisplayOverride>> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function load(): Promise<Map<string, SubjectDisplayOverride>> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetchSubjectOverrides()
      .then((overrides) => {
        cached = overrideMapBySubject(overrides)
        emit()
        return cached
      })
      .catch(() => {
        // Display overrides are progressive enhancement: failure keeps originals.
        cached = new Map()
        emit()
        return cached
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Refresh the shared cache (called by /admin/subject right after saving). */
export function refreshSubjectOverrides(): Promise<Map<string, SubjectDisplayOverride>> {
  cached = null
  return load()
}

export function useSubjectOverrides(): Map<string, SubjectDisplayOverride> {
  const [overrides, setOverrides] = useState<Map<string, SubjectDisplayOverride>>(() => cached ?? new Map())
  useEffect(() => {
    let active = true
    listeners.add(refresh)
    void load().then((next) => {
      if (active) setOverrides(next)
    })
    function refresh() {
      if (cached && active) setOverrides(cached)
    }
    return () => {
      active = false
      listeners.delete(refresh)
    }
  }, [])
  return overrides
}
