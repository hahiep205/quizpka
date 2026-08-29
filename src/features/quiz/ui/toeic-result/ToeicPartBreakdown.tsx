import type { ToeicResultStats, ToeicPartStat } from "@/features/quiz/lib/toeicResultStats"
import type { ToeicResultCopy } from "./toeicResultShared"

type Props = {
  stats: ToeicResultStats
  t: ToeicResultCopy
  showListening: boolean
  showReading: boolean
}

function PartRow({ part, t }: { part: ToeicPartStat; t: ToeicResultCopy }) {
  return (
    <div className="rounded-[10px] border border-[#E5E5E5] bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-900">
      <p className="text-[12px] font-extrabold text-[#100F3E] dark:text-white">{t.partLabel} {part.partNum}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#777777] dark:text-slate-300">
        <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{part.correct} {t.correctShortUnit}</span>
        <span className="mx-1">•</span>
        <span className="font-extrabold text-rose-600 dark:text-rose-300">{part.wrong} {t.wrongShortUnit}</span>
        <span className="mx-1">•</span>
        <span className="font-extrabold text-[#1CB0F6]">{part.accuracy}%</span>
      </p>
    </div>
  )
}

function ListeningSection({ stats, t }: { stats: ToeicResultStats; t: ToeicResultCopy }) {
  const parts = stats.parts.filter((p) => p.partNum >= 1 && p.partNum <= 4)
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-[18px] font-extrabold leading-tight tracking-normal text-[#100F3E] dark:text-white">{t.listeningLabel}</h3>
        <span className="rounded-full bg-[#E8F7FE] px-2.5 py-1 text-[12px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">{stats.listening.total} {t.questionUnit}</span>
      </div>
      <div className="mt-3 space-y-2">
        {parts.map((part) => <PartRow key={part.partNum} part={part} t={t} />)}
      </div>
    </div>
  )
}

function ReadingSection({ stats, t }: { stats: ToeicResultStats; t: ToeicResultCopy }) {
  const parts = stats.parts.filter((p) => p.partNum >= 5 && p.partNum <= 7)
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-[18px] font-extrabold leading-tight tracking-normal text-[#100F3E] dark:text-white">{t.readingLabel}</h3>
        <span className="rounded-full bg-[#E8F7FE] px-2.5 py-1 text-[12px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">{stats.reading.total} {t.questionUnit}</span>
      </div>
      <div className="mt-3 space-y-2">
        {parts.map((part) => <PartRow key={part.partNum} part={part} t={t} />)}
      </div>
    </div>
  )
}

export function ToeicPartBreakdown({ stats, t, showListening, showReading }: Props) {
  const bothSections = showListening && showReading
  return (
    <section className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
      {bothSections ? (
        <div className="grid grid-cols-2 gap-6">
          <ListeningSection stats={stats} t={t} />
          <ReadingSection stats={stats} t={t} />
        </div>
      ) : (
        <>
          {showListening ? <ListeningSection stats={stats} t={t} /> : null}
          {showReading ? (
            <div className={showListening ? "mt-6 border-t-2 border-[#E5E5E5] pt-6 dark:border-white/10" : ""}>
              <ReadingSection stats={stats} t={t} />
            </div>
          ) : null}
        </>
      )}
      <div className="mt-6 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3 text-[12px] font-semibold leading-5 text-[#129BDC] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
        {t.partBreakdownTip}
      </div>
    </section>
  )
}