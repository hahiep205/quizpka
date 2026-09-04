import { getSubjectById } from "@/data/subjects"
import { supabase } from "@/lib/supabase"

type AttemptCounts = Record<string, number>
type AttemptCountListener = (counts: AttemptCounts) => void

let cachedCounts: AttemptCounts = {}
let inflight: Promise<AttemptCounts> | null = null
const listeners = new Set<AttemptCountListener>()

function emitSubjectAttemptCounts(next: AttemptCounts) {
  cachedCounts = next
  for (const listener of listeners) listener(cachedCounts)
}

export function parseSubjectAttemptCounts(rows: unknown): AttemptCounts {
  if (!Array.isArray(rows)) return {}
  const counts: AttemptCounts = {}
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue
    const subjectId = "subject_id" in row ? row.subject_id : undefined
    const attemptCount = "attempt_count" in row ? row.attempt_count : undefined
    if (typeof subjectId !== "string" || !subjectId) continue
    const count = typeof attemptCount === "number" ? attemptCount : Number(attemptCount)
    if (!Number.isFinite(count) || count < 0) continue
    counts[subjectId] = Math.floor(count)
  }
  return counts
}

export function formatSubjectAttemptLabel(count: number, lang: "en" | "vi"): string {
  if (lang === "vi") return "lượt làm"
  return count === 1 ? "attempt" : "attempts"
}

export function getCachedSubjectAttemptCounts(): AttemptCounts {
  return cachedCounts
}

export function subscribeSubjectAttemptCounts(listener: AttemptCountListener) {
  listeners.add(listener)
  listener(cachedCounts)
  return () => {
    listeners.delete(listener)
  }
}

export async function fetchSubjectAttemptCounts(): Promise<AttemptCounts> {
  try {
    const { data, error } = await supabase
      .from("subject_attempt_counts")
      .select("subject_id, attempt_count")
    if (error) return {}
    return parseSubjectAttemptCounts(data)
  } catch {
    return {}
  }
}

export async function loadSubjectAttemptCounts(): Promise<AttemptCounts> {
  if (!inflight) {
    inflight = fetchSubjectAttemptCounts().finally(() => {
      inflight = null
    })
  }
  const next = await inflight
  emitSubjectAttemptCounts(next)
  return next
}

export async function incrementSubjectAttempt(subjectId: string): Promise<void> {
  if (!getSubjectById(subjectId)) return
  try {
    const { data, error } = await supabase.rpc("increment_subject_attempt", { p_subject_id: subjectId })
    if (error) return
    const nextCount = typeof data === "number" && Number.isFinite(data)
      ? Math.floor(data)
      : (cachedCounts[subjectId] ?? 0) + 1
    emitSubjectAttemptCounts({ ...cachedCounts, [subjectId]: Math.max(0, nextCount) })
  } catch {
    // Counting is best-effort and must not block quiz completion.
  }
}
