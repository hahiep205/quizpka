import { useEffect, useMemo, useState } from "react"
import { fetchAdminUserSignupsByDay, type AdminSignupDay } from "@/features/admin/api/adminUsers"

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh"

function vietnamDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function mondayOfWeek(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  return addDays(day, -daysSinceMonday)
}

function formatDate(day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("vi-VN", { ...options, timeZone: VN_TIME_ZONE })
    .format(new Date(`${day}T12:00:00+07:00`))
}

function getWeekday(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][weekday]
}

function weekLabel(weekStart: string): string {
  const weekEnd = addDays(weekStart, 6)
  return `${formatDate(weekStart)} – ${formatDate(weekEnd)}`
}

function makeWeekOptions(currentWeek: string): string[] {
  return Array.from({ length: 12 }, (_, index) => addDays(currentWeek, -7 * index))
}

export function UserGrowthChart() {
  const currentWeek = useMemo(() => mondayOfWeek(vietnamDateString()), [])
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [rows, setRows] = useState<AdminSignupDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchAdminUserSignupsByDay(selectedWeek)
      .then((result) => { if (!cancelled) setRows(result) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được thống kê user mới.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedWeek])

  const chartDays = rows.slice(1, 8)
  const maxCount = Math.max(1, ...chartDays.map((row) => row.count))
  const total = chartDays.reduce((sum, row) => sum + row.count, 0)
  const peak = chartDays.reduce<AdminSignupDay | null>((best, row) => row.count > (best?.count ?? 0) ? row : best, null)
  const deltas = chartDays.map((row, index) => row.count - (rows[index]?.count ?? 0))
  const weekOptions = makeWeekOptions(currentWeek)
  const today = vietnamDateString()

  return (
    <section className="min-w-0 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]" aria-labelledby="admin-user-growth-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Tăng trưởng người dùng</p>
          <h2 id="admin-user-growth-title" className="mt-1 text-lg font-black tracking-tight text-[#101A33] sm:text-xl dark:text-white">User mới theo ngày</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Số tài khoản được tạo mỗi ngày · giờ Việt Nam</p>
        </div>
        <label className="flex shrink-0 flex-col gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
          Chọn tuần
          <select value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)} className="h-10 min-w-[180px] rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-xs font-extrabold normal-case tracking-normal text-[#101A33] outline-none focus:border-sky-300 dark:border-white/10 dark:bg-slate-800 dark:text-white">
            {weekOptions.map((week, index) => <option key={week} value={week}>{index === 0 ? "Tuần này · " : "Tuần · "}{weekLabel(week)}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-[420px]">
        <div className="rounded-[14px] bg-[#EAF5FE] px-3.5 py-3 dark:bg-sky-500/10">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-300">User mới trong tuần</p>
          <p className="mt-1 text-[28px] font-black leading-none text-[#1C9CF0] tabular-nums">{loading ? "…" : total}</p>
        </div>
        <div className="rounded-[14px] bg-[#F0EBFF] px-3.5 py-3 dark:bg-violet-500/10">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-300">Ngày cao nhất</p>
          <p className="mt-1 truncate text-lg font-black leading-tight text-[#6D4AE8] dark:text-violet-300">{loading ? "…" : peak ? `${getWeekday(peak.day)} · ${peak.count}` : "Chưa có"}</p>
        </div>
      </div>

      <div className="relative mt-5 min-h-[230px] rounded-xl bg-slate-50/70 px-2 pb-2 pt-3 dark:bg-white/[0.025]" aria-label={`Biểu đồ user mới ${weekLabel(selectedWeek)}`}>
        <div className="pointer-events-none absolute inset-x-3 top-4 bottom-10 flex flex-col justify-between" aria-hidden="true">
          {[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-dashed border-slate-200 dark:border-white/10" />)}
        </div>
        {error ? (
          <div className="relative flex min-h-[210px] items-center justify-center px-4 text-center text-sm font-bold text-rose-500">{error}</div>
        ) : loading ? (
          <div className="relative flex min-h-[210px] items-center justify-center text-sm font-bold text-slate-400">Đang tải số liệu…</div>
        ) : (
          <div className="relative grid min-h-[210px] grid-cols-7 gap-1 sm:gap-3" role="list" aria-label="Số user mới từng ngày">
            {chartDays.map((row, index) => {
              const delta = deltas[index] ?? 0
              const barHeight = row.count === 0 ? 2 : Math.max(8, (row.count / maxCount) * 132)
              const isToday = row.day === today
              const deltaText = delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "0"
              const deltaTone = delta > 0
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                : delta < 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
              return (
                <div key={row.day} role="listitem" title={`${formatDate(row.day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}: ${row.count} user mới, ${deltaText} so với hôm trước`} className="flex min-w-0 flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-black tabular-nums text-[#101A33] dark:text-white">{row.count}</span>
                  <div className="flex h-[138px] w-full items-end justify-center">
                    <div className={`w-[58%] max-w-12 rounded-t-[9px] transition-[height] duration-300 ${isToday ? "bg-gradient-to-t from-[#0B72CB] to-[#35B8FA]" : "bg-gradient-to-t from-[#228FE0] to-[#8BD7FC] dark:from-sky-600 dark:to-sky-400"}`} style={{ height: `${barHeight}px` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{getWeekday(row.day)} {formatDate(row.day, { day: "numeric" })}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black tabular-nums sm:text-[10px] ${deltaTone}`}>{deltaText}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
        <span>{weekLabel(selectedWeek)}</span>
        <span>Chênh lệch mỗi ngày so với ngày liền trước · tuần tính từ thứ Hai</span>
      </div>
    </section>
  )
}
