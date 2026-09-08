import type { ActivityEvent, PracticeAttemptRow } from "@/features/activity/lib/activityLog"

export type DayBucket = {
  date: string // yyyy-mm-dd (UTC)
  label: string // dd/mm
  attempts: number
  events: number
}

export function dayKeyOf(iso: string): string | null {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).toISOString().slice(0, 10)
}

/** 14 ngày gần nhất (kết thúc hôm nay UTC), đếm attempts + events mỗi ngày. */
export function bucketLast14Days(
  attempts: PracticeAttemptRow[],
  events: ActivityEvent[],
  now = Date.now(),
  days = 14,
): DayBucket[] {
  const buckets = new Map<string, DayBucket>()
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const date = d.toISOString().slice(0, 10)
    buckets.set(date, {
      date,
      label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      attempts: 0,
      events: 0,
    })
  }
  for (const a of attempts) {
    const k = dayKeyOf(a.completedAt)
    const b = k ? buckets.get(k) : undefined
    if (b) b.attempts += 1
  }
  for (const e of events) {
    const k = dayKeyOf(e.createdAt)
    const b = k ? buckets.get(k) : undefined
    if (b) b.events += 1
  }
  return [...buckets.values()]
}

export type HourBucket = {
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

export function countByKey(items: string[], limit = 8): Array<{ key: string; count: number }> {
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

export function topLearners(attempts: PracticeAttemptRow[], limit = 10): Array<{ userId: string; attempts: number; avgAccuracy: number }> {
  const m = new Map<string, { n: number; acc: number }>()
  for (const a of attempts) {
    const cur = m.get(a.userId) ?? { n: 0, acc: 0 }
    cur.n += 1
    cur.acc += a.accuracy
    m.set(a.userId, cur)
  }
  return [...m.entries()]
    .map(([userId, v]) => ({ userId, attempts: v.n, avgAccuracy: Math.round(v.acc / v.n) }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, limit)
}

export function eventsByType(events: ActivityEvent[]): Array<{ key: string; count: number }> {
  return countByKey(events.map((e) => e.eventType), 12)
}

export const DAY_MS = 24 * 60 * 60 * 1000

/** Giữ lại items có date trong `days` ngày gần nhất (days=0 nghĩa là tất cả). */
export function filterByDays<T>(items: T[], getDate: (item: T) => string, days: number, now = Date.now()): T[] {
  if (!days || days <= 0) return items
  const cutoff = now - days * DAY_MS
  return items.filter((item) => {
    const t = Date.parse(getDate(item))
    return Number.isFinite(t) && t >= cutoff
  })
}
