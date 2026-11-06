import { supabase } from "@/lib/supabase"
import {
  parseActivityRows,
  parseAttemptRows,
  type ActivityEvent,
  type PracticeAttemptRow,
} from "@/features/activity/lib/activityLog"

type AdminTimelineResult =
  | { ok: true; events: ActivityEvent[] }
  | { ok: false; error: string; events: ActivityEvent[] }

type AdminAttemptsResult =
  | { ok: true; attempts: PracticeAttemptRow[] }
  | { ok: false; error: string; attempts: PracticeAttemptRow[] }

export type AdminSubjectSubmissionCount = { subjectId: string; count: number }

/**
 * P-log-cost: 1 request thay cho vòng dump 1000 dòng/trang. user_activity_events
 * bị cron prune giữ ở vài nghìn dòng gần nhất nên window 3000 đủ phủ toàn bộ
 * dữ liệu cho timeline + anomaly detection + CSV export.
 */
export async function fetchAdminEvents(limit = 3000): Promise<AdminTimelineResult> {
  try {
    const { data, error } = await supabase.rpc("admin_list_events", { p_limit: limit })
    if (error) return { ok: false, events: [], error: `Không đọc được user_activity_events: ${error.message}` }
    const result = (data ?? {}) as { items?: unknown[] }
    return { ok: true, events: parseActivityRows(result.items) }
  } catch (err) {
    return { ok: false, events: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/** Count today's submit events without relying on the capped event list. */
export async function fetchAdminTodaySubmitCount(): Promise<{ ok: true; count: number } | { ok: false; count: number; error: string }> {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const localDay = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, "0"), String(start.getDate()).padStart(2, "0")].join("-")
    const { data, error } = await supabase.rpc("admin_count_submit_attempts", {
      p_day: localDay,
    })
    if (error) return { ok: false, count: 0, error: `Không đếm được lượt nộp bài hôm nay: ${error.message}` }
    return { ok: true, count: Number(data) || 0 }
  } catch (err) {
    return { ok: false, count: 0, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function fetchAdminTodaySubmissionsBySubject(): Promise<{ ok: true; items: AdminSubjectSubmissionCount[] } | { ok: false; items: AdminSubjectSubmissionCount[]; error: string }> {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date())
    const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value ?? ""
    const day = `${part("year")}-${part("month")}-${part("day")}`
    const { data, error } = await supabase.rpc("admin_submit_attempts_by_subject", { p_day: day })
    if (error) return { ok: false, items: [], error: `Không tải được lượt nộp theo môn: ${error.message}` }
    const result = (data ?? {}) as { items?: unknown[] }
    const items = (result.items ?? []).flatMap((row) => {
      if (typeof row !== "object" || row === null) return []
      const item = row as { subject_id?: unknown; count?: unknown }
      if (typeof item.subject_id !== "string") return []
      return [{ subjectId: item.subject_id, count: Number(item.count) || 0 }]
    })
    return { ok: true, items }
  } catch (err) {
    return { ok: false, items: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function fetchAdminAttempts(limit = 3000): Promise<AdminAttemptsResult> {
  try {
    const { data, error } = await supabase.rpc("admin_list_attempts", { p_limit: limit })
    if (error) return { ok: false, attempts: [], error: `Không đọc được practice_attempts: ${error.message}` }
    const result = (data ?? {}) as { items?: unknown[] }
    return { ok: true, attempts: parseAttemptRows(result.items) }
  } catch (err) {
    return { ok: false, attempts: [], error: err instanceof Error ? err.message : "Unknown error" }
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

/** Lịch sử tải PDF (mới nhất trước) cho /admin/downloads. */
export async function fetchDownloadHistory(limit = 200): Promise<AdminTimelineResult> {
  try {
    const { data, error } = await supabase
      .from("user_activity_events")
      .select("id,user_id,event_type,metadata,created_at")
      .eq("event_type", "download_pdf")
      .order("id", { ascending: false })
      .limit(limit)
    if (error) return { ok: false, events: [], error: `Không đọc được lịch sử tải về: ${error.message}` }
    return { ok: true, events: parseActivityRows(data) }
  } catch (err) {
    return { ok: false, events: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}
