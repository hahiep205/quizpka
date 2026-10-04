import type { ActivityEvent, PracticeAttemptRow } from "@/features/activity/lib/activityLog"

type HourBucket = {
  hour: number // 0-23, local time
  label: string // "00h".."23h"
  attempts: number
  events: number
}

function hourKeyOf(iso: string): number | null {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).getHours()
}

function isTodayLocal(iso: string, now: number): boolean {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return false
  const d = new Date(t)
  const n = new Date(now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** 24 khung giờ hôm nay (giờ địa phương), đếm attempts + events mỗi giờ. */
export function bucketHoursToday(
  attempts: PracticeAttemptRow[],
  events: ActivityEvent[],
  now = Date.now(),
): HourBucket[] {
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}h`,
    attempts: 0,
    events: 0,
  }))
  for (const a of attempts) {
    const h = hourKeyOf(a.completedAt)
    if (h !== null && isTodayLocal(a.completedAt, now)) buckets[h].attempts += 1
  }
  for (const e of events) {
    const h = hourKeyOf(e.createdAt)
    if (h !== null && isTodayLocal(e.createdAt, now)) buckets[h].events += 1
  }
  return buckets
}

function countByKey(items: string[], limit = 8): Array<{ key: string; count: number }> {
  const m = new Map<string, number>()
  for (const k of items) {
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function topSubjects(attempts: PracticeAttemptRow[], limit = 8): Array<{ key: string; count: number }> {
  return countByKey(attempts.map((a) => a.subjectId), limit)
}

export function eventsByType(events: ActivityEvent[]): Array<{ key: string; count: number }> {
  return countByKey(events.map((e) => e.eventType), 12)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Giữ lại items có date trong `days` ngày gần nhất (days=0 nghĩa là tất cả). */
export function filterByDays<T>(items: T[], getDate: (item: T) => string, days: number, now = Date.now()): T[] {
  if (!days || days <= 0) return items
  const cutoff = now - days * DAY_MS
  return items.filter((item) => {
    const t = Date.parse(getDate(item))
    return Number.isFinite(t) && t >= cutoff
  })
}
