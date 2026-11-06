import { cn } from "@/lib/utils"

type SubjectCount = { key: string; count: number }

export function TodaySubjectsChart({ subjects, total }: { subjects: SubjectCount[]; total: number }) {
  const knownSubjectCount = subjects.filter((item) => item.key).length
  const palette = ["#0FC57C", "#3BD598", "#6FE3AE", "#A4EFC6", "#C9F5DD", "#E0F8EA", "#8ADFC0", "#5BD6A4"]
  const dots = ["bg-[#1CB0F6]", "bg-[#55C2F8]", "bg-[#80D2FA]", "bg-[#A6E1FC]", "bg-[#C2ECFD]"]
  let accumulated = 0

  return (
    <section className="min-w-0 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]" aria-labelledby="today-subjects-title">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Thống kê các môn được làm trong ngày</p>
      <h2 id="today-subjects-title" className="mt-1 text-lg font-black tracking-tight text-[#101A33] sm:text-xl dark:text-white">
        {subjects.length ? `Hôm nay có ${knownSubjectCount} môn được nộp` : "Hôm nay chưa có môn nào được nộp"}
      </h2>

      <div className="mt-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative mx-auto h-[152px] w-[152px] shrink-0 sm:mx-0 sm:h-[168px] sm:w-[168px]">
          {total > 0 ? (
            <svg viewBox="0 0 160 160" className="block h-full w-full -rotate-90" role="img" aria-label={`${total} lượt nộp theo môn`}>
              {subjects.map((subject, index) => {
                const fraction = subject.count / total
                const start = accumulated
                accumulated += fraction
                const circumference = 2 * Math.PI * 60
                const gap = subjects.length > 1 ? 0.012 : 0
                return (
                  <circle
                    key={`${subject.key}-${index}`}
                    cx={80}
                    cy={80}
                    r={60}
                    fill="none"
                    stroke={palette[index % palette.length]}
                    strokeWidth={22}
                    strokeDasharray={`${(Math.max(0, fraction - gap) * circumference).toFixed(2)} ${circumference.toFixed(2)}`}
                    strokeDashoffset={`${(-start * circumference).toFixed(2)}`}
                    strokeLinecap="butt"
                  />
                )
              })}
            </svg>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border-[22px] border-slate-100 dark:border-white/10" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-black tracking-tight text-[#101A33] tabular-nums dark:text-white">{total}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-400">lượt nộp</p>
          </div>
        </div>

        <div className="max-h-[280px] min-w-0 flex-1 space-y-2 overflow-y-auto pr-1 sm:max-h-[360px]">
          {subjects.length ? subjects.map((subject, index) => {
            const percent = total > 0 ? Math.round((subject.count / total) * 100) : 0
            const label = subject.key || "Không xác định môn"
            return (
              <div key={`${subject.key}-${index}`} title={`${label}: ${subject.count} (${percent}%)`} className="relative flex h-10 min-w-0 items-center overflow-hidden rounded-[12px] bg-[#F1F5F9] sm:h-11 dark:bg-white/5">
                <div className="absolute inset-y-0 left-0 rounded-[12px] bg-[#BEE5FB] dark:bg-sky-500/25" style={{ width: `${percent}%`, minWidth: 104, maxWidth: "100%" }} />
                <div className="relative flex min-w-0 w-full items-center gap-2 pl-3 pr-2.5">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dots[Math.min(index, dots.length - 1)])} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#1E3A5F] dark:text-slate-100">{label}</span>
                  <span className="shrink-0 text-[15px] font-black text-[#101A33] tabular-nums dark:text-white">{subject.count}</span>
                  <span className="w-9 shrink-0 text-right text-xs font-bold text-slate-400 tabular-nums">{percent}%</span>
                </div>
              </div>
            )
          }) : <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có lượt nộp hôm nay.</p>}
        </div>
      </div>
    </section>
  )
}
