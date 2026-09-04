import { getSubjectById } from "@/data/subjects"
import { PRACTICE_HISTORY_KEY, type PracticeHistoryItem } from "@/lib/practiceSession"
import { supabase } from "@/lib/supabase"

export const SUBJECT_ATTEMPT_COUNTS_KEY = "quizpka-subject-attempt-counts-v1"

type AttemptCounts = Record<string, number>
type AttemptCountListener = (counts: AttemptCounts) => void

let cachedCounts: AttemptCounts = {}
let inflight: Promise<AttemptCounts> | null = null
const listeners = new Set<AttemptCountListener>()

function emitSubjectAttemptCounts(next: AttemptCounts) {
  cachedCounts = next
  persistAttemptCounts(next)
  for (const listener of listeners) listener(cachedCounts)
}

export function parseCount(value: unknown): number | null {
  const count = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(count) || count < 0) return null
  return Math.floor(count)
}

export function parseSubjectAttemptCounts(rows: unknown): AttemptCounts {
  if (!Array.isArray(rows)) return {}
  const counts: AttemptCounts = {}
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue
    const subjectId = "subject_id" in row ? row.subject_id : undefined
    const attemptCount = "attempt_count" in row ? row.attempt_count : undefined
    if (typeof subjectId !== "string" || !subjectId) continue
    const count = parseCount(attemptCount)
    if (count === null) continue
    counts[subjectId] = count
  }
  return counts
}

export function parseAttemptCountMap(value: unknown): AttemptCounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const counts: AttemptCounts = {}
  for (const [subjectId, raw] of Object.entries(value)) {
    const count = parseCount(raw)
    if (!subjectId || count === null) continue
    counts[subjectId] = count
  }
  return counts
}

export function mergeAttemptCounts(...maps: AttemptCounts[]): AttemptCounts {
  const merged: AttemptCounts = {}
  for (const map of maps) {
    for (const [subjectId, count] of Object.entries(map)) {
      merged[subjectId] = Math.max(merged[subjectId] ?? 0, count)
    }
  }
  return merged
}

export function addAttemptCounts(...maps: AttemptCounts[]): AttemptCounts {
  const merged: AttemptCounts = {}
  for (const map of maps) {
    for (const [subjectId, count] of Object.entries(map)) {
      merged[subjectId] = (merged[subjectId] ?? 0) + count
    }
  }
  return merged
}

export function countAttemptsFromHistory(history: PracticeHistoryItem[]): AttemptCounts {
  const counts: AttemptCounts = {}
  for (const item of history) {
    if (!item?.subjectId) continue
    counts[item.subjectId] = (counts[item.subjectId] ?? 0) + 1
  }
  return counts
}

function readPersistedAttemptCounts(): AttemptCounts {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(SUBJECT_ATTEMPT_COUNTS_KEY)
    return raw ? parseAttemptCountMap(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

function persistAttemptCounts(counts: AttemptCounts) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SUBJECT_ATTEMPT_COUNTS_KEY, JSON.stringify(counts))
  } catch {
    // Storage is optional.
  }
}

export function readLocalHistoryAttemptCounts(): AttemptCounts {
  if (typeof window === "undefined") return {}
  try {
    const counts: AttemptCounts = {}
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(PRACTICE_HISTORY_KEY)) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const value: unknown = JSON.parse(raw)
      const history = Array.isArray(value) ? value as PracticeHistoryItem[] : []
      Object.assign(counts, addAttemptCounts(counts, countAttemptsFromHistory(history)))
    }
    return counts
  } catch {
    return {}
  }
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
  let server: AttemptCounts = {}
  try {
    const { data, error } = await supabase
      .from("subject_attempt_counts")
      .select("subject_id, attempt_count")
    if (!error) server = parseSubjectAttemptCounts(data)
  } catch {
    // Keep local counts when the shared table is unavailable.
  }
  return mergeAttemptCounts(server, cachedCounts, readPersistedAttemptCounts(), readLocalHistoryAttemptCounts())
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
  const optimistic = (cachedCounts[subjectId] ?? 0) + 1
  emitSubjectAttemptCounts({ ...cachedCounts, [subjectId]: optimistic })

  try {
    const { data, error } = await supabase.rpc("increment_subject_attempt", { p_subject_id: subjectId })
    if (error) return
    const serverCount = parseCount(data)
    if (serverCount === null) return
    emitSubjectAttemptCounts({
      ...cachedCounts,
      [subjectId]: Math.max(optimistic, serverCount),
    })
  } catch {
    // Local count already increased so the card does not stay at 0.
  }
}

cachedCounts = mergeAttemptCounts(readPersistedAttemptCounts(), readLocalHistoryAttemptCounts())
