import type { ToeicResultStats } from "@/features/quiz/lib/toeicResultStats"
import type { ToeicResultCopy } from "./toeicResultShared"

type Props = {
  stats: ToeicResultStats
  t: ToeicResultCopy
  showListening: boolean
  showReading: boolean
}

function SectionCard({ label, score, accuracy, t }: { label: string; score: number; accuracy: number; t: ToeicResultCopy }) {
  return (
    <div className="rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] p-4 text-center dark:border-white/10 dark:bg-white/5">
      <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-[32px] font-extrabold leading-none tracking-[-0.04em] text-[#100F3E] dark:text-white">
        {score}
        <span className="text-[16px] font-bold text-[#777777]"> / 495 {t.points}</span>
      </p>
      <p className="mt-2 text-[12px] font-semibold text-[#777777] dark:text-slate-400">
        {t.accuracyLabel} {accuracy}%
      </p>
    </div>
  )
}

export function ToeicSectionScores({ stats, t, showListening, showReading }: Props) {
  if (!showListening && !showReading) return null
  return (
    <section className="grid grid-cols-2 gap-3">
      {showListening ? <SectionCard label={t.listening} score={stats.sectionScores.listening} accuracy={stats.listening.accuracy} t={t} /> : null}
      {showReading ? <SectionCard label={t.reading} score={stats.sectionScores.reading} accuracy={stats.reading.accuracy} t={t} /> : null}
    </section>
  )
}
