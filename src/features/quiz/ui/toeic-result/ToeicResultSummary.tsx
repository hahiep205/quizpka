import { StatCard } from "@/features/quiz/ui/StatCard"
import { ResultStamp } from "@/features/quiz/ui/ResultStamp"
import type { ToeicResultStats } from "@/features/quiz/lib/toeicResultStats"
import type { ToeicResultCopy } from "./toeicResultShared"

type Props = {
  stats: ToeicResultStats
  duration: string
  t: ToeicResultCopy
  heroScore: number
  isExam: boolean
  score10: number
}

export function ToeicResultSummary({ stats, duration, t, heroScore, isExam, score10 }: Props) {
  return (
    <section className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col items-center text-center">
        <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{t.predictedScore}</p>
        <p className="mt-1 text-[68px] font-extrabold leading-none tracking-[-0.05em] text-[#100F3E] dark:text-white">{heroScore}</p>
        <p className="mt-3 rounded-full bg-[#E8F7FE] px-4 py-1.5 text-[13px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
          {t.heroCorrect} {stats.total.correct}/{stats.total.total} {t.ofQuestion}
          <span className="mx-1.5">•</span>
          {t.heroAccuracy} {stats.total.accuracy}%
        </p>
      </div>
      <div className="relative mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t.correctShort} value={`${stats.total.correct}`} />
          <StatCard label={t.wrongShort} value={`${stats.total.wrong}`} />
          <StatCard label={t.skippedShort} value={`${stats.total.skipped}`} />
          <StatCard label={t.durationShort} value={duration} />
        </div>
        {isExam ? <ResultStamp score={score10} /> : null}
      </div>
    </section>
  )
}
