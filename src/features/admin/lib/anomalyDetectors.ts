import type { ActivityEvent, PracticeAttemptRow } from "@/features/activity/lib/activityLog"

/**
 * Phát hiện hoạt động bất thường (rule-based, chỉ A1/A2/A3/A6/A7).
 * Mọi hàm đều thuần (dễ test). Chỉ gắn cờ để admin review, không tự block.
 */

export type AnomalyCode = "A1" | "A2" | "A3" | "A6" | "A7"
export type AnomalySeverity = "high" | "medium" | "low"

export type AnomalyFlag = {
  code: AnomalyCode
  severity: AnomalySeverity
  userId: string
  reasonVi: string
  evidence: {
    historyIds?: string[]
    eventIds?: number[]
    metric?: number
  }
  createdAt: string
}

export const ANOMALY_THRESHOLDS = {
  /** A1: số giây/câu tối thiểu ở mode exam/hard (nhỏ hơn = siêu tốc). */
  minSecondsPerQuestionExam: 5,
  /** A1/A2: bỏ qua bài quá ngắn (tránh nhiễu đề 1-2 câu). */
  minQuestions: 5,
  /** A2: số giây/câu tối đa mà vẫn đạt 100%. */
  maxSecondsPerQuestionPerfect: 10,
  /** A3: số lượt nộp tối đa trong cửa sổ (trượt). */
  maxSubmitsPerWindow: 10,
  /** A3: cửa sổ trượt (ms). */
  submitWindowMs: 10 * 60 * 1000,
  /** A6: 2 lượt cùng examId cách nhau ít hơn ngưỡng = nộp trùng. */
  duplicateSubmitMs: 30 * 1000,
  /** A7: số lần sửa profile tối đa mỗi ngày (UTC). */
  maxProfileUpdatesPerDay: 5,
} as const

export type AnomalyThresholds = typeof ANOMALY_THRESHOLDS

export const ANOMALY_META: Record<AnomalyCode, { severity: AnomalySeverity; labelVi: string }> = {
  A1: { severity: "high", labelVi: "Nộp bài siêu tốc" },
  A2: { severity: "high", labelVi: "Tuyệt đối + tốc độ ảo" },
  A3: { severity: "medium", labelVi: "Spam lượt nộp" },
  A6: { severity: "medium", labelVi: "Nộp trùng lặp" },
  A7: { severity: "low", labelVi: "Spam sửa profile" },
}

const EXAM_MODES = new Set(["exam", "hard"])

function isExamAttempt(a: PracticeAttemptRow): boolean {
  return EXAM_MODES.has((a.mode ?? "").toLowerCase())
}

/** A1: nộp bài exam/hard nhanh hơn ngưỡng giây/câu. */
export function detectSuperFast(
  attempts: PracticeAttemptRow[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = []
  for (const a of attempts) {
    if (!isExamAttempt(a)) continue
    if (a.total < t.minQuestions || a.total <= 0 || a.durationSeconds <= 0) continue
    const spq = a.durationSeconds / a.total
    if (spq < t.minSecondsPerQuestionExam) {
      flags.push({
        code: "A1",
        severity: ANOMALY_META.A1.severity,
        userId: a.userId,
        reasonVi: `Nộp ${a.total} câu trong ${a.durationSeconds}s (~${spq.toFixed(1)}s/câu) ở chế độ ${a.mode}`,
        evidence: { historyIds: [a.historyId], metric: Math.round(spq * 10) / 10 },
        createdAt: a.completedAt,
      })
    }
  }
  return flags
}

/** A2: đạt 100% với tốc độ không tưởng ở exam/hard. */
export function detectPerfectTooFast(
  attempts: PracticeAttemptRow[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = []
  for (const a of attempts) {
    if (!isExamAttempt(a)) continue
    if (a.accuracy < 100) continue
    if (a.total < t.minQuestions || a.total <= 0 || a.durationSeconds <= 0) continue
    const spq = a.durationSeconds / a.total
    if (spq < t.maxSecondsPerQuestionPerfect) {
      flags.push({
        code: "A2",
        severity: ANOMALY_META.A2.severity,
        userId: a.userId,
        reasonVi: `Đạt 100% (${a.correct}/${a.total}) chỉ trong ${a.durationSeconds}s (~${spq.toFixed(1)}s/câu) ở chế độ ${a.mode}`,
        evidence: { historyIds: [a.historyId], metric: Math.round(spq * 10) / 10 },
        createdAt: a.completedAt,
      })
    }
  }
  return flags
}

/** A3: quá nhiều lượt nộp trong cửa sổ trượt (bot/cày). Mỗi cụm chỉ flag 1 lần. */
export function detectSubmitSpam(
  attempts: PracticeAttemptRow[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  const sorted = attempts
    .map((a) => ({ a, t: Date.parse(a.completedAt) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((x, y) => x.t - y.t)
  const flags: AnomalyFlag[] = []
  let i = 0
  while (i < sorted.length) {
    const start = sorted[i]
    if (!start) break
    let j = i
    while (j + 1 < sorted.length) {
      const next = sorted[j + 1]
      if (!next || next.t - start.t > t.submitWindowMs) break
      j += 1
    }
    const count = j - i + 1
    if (count >= t.maxSubmitsPerWindow) {
      const window = sorted.slice(i, j + 1)
      const last = window[window.length - 1]
      const minutes = last ? Math.max(1, Math.round((last.t - start.t) / 60000)) : 0
      flags.push({
        code: "A3",
        severity: ANOMALY_META.A3.severity,
        userId: start.a.userId,
        reasonVi: `${count} lượt nộp trong ~${minutes} phút`,
        evidence: { historyIds: window.map((x) => x.a.historyId), metric: count },
        createdAt: start.a.completedAt,
      })
      i = j + 1
    } else {
      i += 1
    }
  }
  return flags
}

/** A6: 2 lượt liên tiếp cùng examId cách nhau quá ngắn. */
export function detectDuplicateSubmits(
  attempts: PracticeAttemptRow[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  const sorted = attempts
    .map((a) => ({ a, t: Date.parse(a.completedAt) }))
    .filter((x) => Number.isFinite(x.t) && x.a.examId)
    .sort((x, y) => x.t - y.t)
  const flags: AnomalyFlag[] = []
  for (let k = 1; k < sorted.length; k += 1) {
    const prev = sorted[k - 1]
    const cur = sorted[k]
    if (!prev || !cur) continue
    if (prev.a.examId !== cur.a.examId) continue
    const gapMs = cur.t - prev.t
    if (gapMs >= 0 && gapMs < t.duplicateSubmitMs) {
      flags.push({
        code: "A6",
        severity: ANOMALY_META.A6.severity,
        userId: cur.a.userId,
        reasonVi: `2 lượt nộp cùng đề "${cur.a.title || cur.a.examId}" cách nhau ${Math.round(gapMs / 1000)}s`,
        evidence: { historyIds: [prev.a.historyId, cur.a.historyId], metric: Math.round(gapMs / 1000) },
        createdAt: cur.a.completedAt,
      })
    }
  }
  return flags
}

/** A7: sửa profile quá nhiều lần trong 1 ngày UTC. */
export function detectProfileSpam(
  events: ActivityEvent[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  const byDay = new Map<string, ActivityEvent[]>()
  for (const e of events) {
    if (e.eventType !== "update_profile") continue
    const day = e.createdAt ? new Date(Date.parse(e.createdAt)).toISOString().slice(0, 10) : ""
    if (!day || day === "NaN-NaN-NaN") continue
    const list = byDay.get(day) ?? []
    list.push(e)
    byDay.set(day, list)
  }
  const flags: AnomalyFlag[] = []
  for (const [day, list] of byDay) {
    if (list.length >= t.maxProfileUpdatesPerDay) {
      flags.push({
        code: "A7",
        severity: ANOMALY_META.A7.severity,
        userId: list[0]?.userId ?? "",
        reasonVi: `${list.length} lần sửa profile trong ngày ${day}`,
        evidence: { eventIds: list.map((e) => e.id), metric: list.length },
        createdAt: list[0]?.createdAt ?? "",
      })
    }
  }
  return flags
}

const SEVERITY_WEIGHT: Record<AnomalySeverity, number> = { high: 3, medium: 2, low: 1 }

/** Risk score = 3×high + 2×medium + 1×low. */
export function riskScore(flags: AnomalyFlag[]): number {
  return flags.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0)
}

/** Chạy toàn bộ rules cho 1 user (attempts + events đã lọc theo user). */
export function detectUserAnomalies(
  attempts: PracticeAttemptRow[],
  events: ActivityEvent[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  return [
    ...detectSuperFast(attempts, t),
    ...detectPerfectTooFast(attempts, t),
    ...detectSubmitSpam(attempts, t),
    ...detectDuplicateSubmits(attempts, t),
    ...detectProfileSpam(events, t),
  ].sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
}

/** Chạy cho nhiều user: attempts/events lẫn nhiều user, tự group theo userId. */
export function detectAllAnomalies(
  attempts: PracticeAttemptRow[],
  events: ActivityEvent[],
  t: AnomalyThresholds = ANOMALY_THRESHOLDS,
): AnomalyFlag[] {
  const byUser = new Map<string, { attempts: PracticeAttemptRow[]; events: ActivityEvent[] }>()
  for (const a of attempts) {
    const g = byUser.get(a.userId) ?? { attempts: [], events: [] }
    g.attempts.push(a)
    byUser.set(a.userId, g)
  }
  for (const e of events) {
    const g = byUser.get(e.userId) ?? { attempts: [], events: [] }
    g.events.push(e)
    byUser.set(e.userId, g)
  }
  const out: AnomalyFlag[] = []
  for (const g of byUser.values()) out.push(...detectUserAnomalies(g.attempts, g.events, t))
  return out
}
