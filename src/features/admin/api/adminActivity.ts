import { supabase } from "@/lib/supabase"
import {
  parseActivityRows,
  parseAttemptRows,
  type ActivityEvent,
  type PracticeAttemptRow,
} from "@/features/activity/lib/activityLog"

export type AdminTimelineResult =
  | { ok: true; events: ActivityEvent[] }
  | { ok: false; error: string; events: ActivityEvent[] }

export type AdminAttemptsResult =
  | { ok: true; attempts: PracticeAttemptRow[] }
  | { ok: false; error: string; attempts: PracticeAttemptRow[] }

/** Timeline global (mới nhất trước), join tên user ở client qua map id->label. */
export async function fetchActivityTimeline(limit = 300, offset = 0): Promise<AdminTimelineResult> {
  try {
    const { data, error } = await supabase
      .from("user_activity_events")
      .select("id,user_id,event_type,metadata,created_at")
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return { ok: false, events: [], error: `Không đọc được user_activity_events: ${error.message}. Hãy chạy migration 20260905100000_activity_observability.sql` }
    return { ok: true, events: parseActivityRows(data) }
  } catch (err) {
    return { ok: false, events: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function fetchAllActivityTimeline(): Promise<AdminTimelineResult> {
  const events: ActivityEvent[] = []
  let offset = 0
  while (true) {
    const result = await fetchActivityTimeline(1000, offset)
    if (!result.ok) return result
    events.push(...result.events)
    if (result.events.length < 1000) return { ok: true, events }
    offset += result.events.length
  }
}

export async function fetchUserActivity(userId: string, limit = 100): Promise<AdminTimelineResult> {
  try {
    const { data, error } = await supabase
      .from("user_activity_events")
      .select("id,user_id,event_type,metadata,created_at")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(limit)
    if (error) return { ok: false, events: [], error: error.message }
    return { ok: true, events: parseActivityRows(data) }
  } catch (err) {
    return { ok: false, events: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function fetchPracticeAttempts(userId?: string, limit = 300, offset = 0): Promise<AdminAttemptsResult> {
  try {
    let q = supabase
      .from("practice_attempts")
      .select("history_id,user_id,exam_id,subject_id,title,mode,score,correct,total,accuracy,duration_seconds,retry_of,retry_number,completed_at")
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1)
    if (userId) q = q.eq("user_id", userId)
    const { data, error } = await q
    if (error) return { ok: false, attempts: [], error: `Không đọc được practice_attempts: ${error.message}. Hãy chạy migration 20260905100000_activity_observability.sql` }
    return { ok: true, attempts: parseAttemptRows(data) }
  } catch (err) {
    return { ok: false, attempts: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function fetchAllPracticeAttempts(userId?: string): Promise<AdminAttemptsResult> {
  const attempts: PracticeAttemptRow[] = []
  let offset = 0
  while (true) {
    const result = await fetchPracticeAttempts(userId, 1000, offset)
    if (!result.ok) return result
    attempts.push(...result.attempts)
    if (result.attempts.length < 1000) return { ok: true, attempts }
    offset += result.attempts.length
  }
}
