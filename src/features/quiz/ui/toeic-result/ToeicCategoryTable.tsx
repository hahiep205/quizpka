import { useState } from "react"
import { Check, ListChecks, Minus, X } from "lucide-react"
import type { ToeicCategoryStat, ToeicPartStat, ToeicResultStats } from "@/features/quiz/lib/toeicResultStats"
import { getToeicCategoryLabel } from "@/features/quiz/lib/toeicCategories"
import type { ToeicResultCopy } from "./toeicResultShared"

type Props = {
  stats: ToeicResultStats
  t: ToeicResultCopy
  lang: "en" | "vi"
  onOpenQuestionList: (questionIds: string[]) => void
}

type Tab = "overview" | number

const statusItem = "flex items-center gap-1 text-[12px] font-extrabold"

function AccuracyBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full min-w-[64px] overflow-hidden rounded-full bg-[#EEF0F6] dark:bg-white/10">
      <div
        className="h-full rounded-full bg-[#1CB0F6] transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function Legend({ t }: { t: ToeicResultCopy }) {
  return (
    <div className="flex items-center justify-end gap-3 text-[11px] font-extrabold text-[#777777] dark:text-slate-400">
      <span className={statusItem}>
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
        {t.correctShort}
      </span>
      <span className={statusItem}>
        <X className="h-3 w-3 text-rose-600 dark:text-rose-300" strokeWidth={3} />
        {t.wrongShort}
      </span>
      <span className={statusItem}>
        <Minus className="h-3 w-3 text-[#9CA3AF]" strokeWidth={3} />
        {t.skippedShort}
      </span>
    </div>
  )
}

function PartSummary({ part, t }: { part: ToeicPartStat; t: ToeicResultCopy }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-3.5 py-2.5 dark:border-white/10 dark:bg-white/5">
      <p className="flex items-center gap-2 text-[12px] font-extrabold text-[#100F3E] dark:text-white">
        {t.partLabel} {part.partNum}
        <span className="rounded-full bg-[#E8F7FE] px-2 py-0.5 text-[11px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
          {part.total} {t.questionUnit}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`${statusItem} text-emerald-700 dark:text-emerald-300`}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          {part.correct}
        </span>
        <span className={`${statusItem} text-rose-600 dark:text-rose-300`}>
          <X className="h-3.5 w-3.5" strokeWidth={3} />
          {part.wrong}
        </span>
        <span className={`${statusItem} text-[#9CA3AF] dark:text-slate-500`}>
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
          {part.skipped}
        </span>
        <span className="text-[12px] font-extrabold text-[#1CB0F6]">
          {t.accuracyShort} {part.accuracy}%
        </span>
      </div>
    </div>
  )
}

function CategoryRow({
  cat,
  t,
  lang,
  onOpenQuestionList,
}: {
  cat: ToeicCategoryStat
  t: ToeicResultCopy
  lang: "en" | "vi"
  onOpenQuestionList: (questionIds: string[]) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] border-2 border-[#E5E5E5] bg-white px-3.5 py-2.5 shadow-[0_2px_0_#ECECEC] transition hover:border-[#B3E5FC] dark:border-white/10 dark:bg-slate-900 dark:hover:border-sky-500/40">
      <div className="min-w-[160px] flex-1">
        <p className="truncate text-[13px] font-extrabold leading-5 text-[#100F3E] dark:text-white">
          {getToeicCategoryLabel(cat.key, lang)}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#777777] dark:text-slate-400">
          {t.partLabel} {cat.partNum} • {cat.total} {t.questionUnit}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`${statusItem} text-emerald-700 dark:text-emerald-300`}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          {cat.correct}
        </span>
        <span className={`${statusItem} text-rose-600 dark:text-rose-300`}>
          <X className="h-3.5 w-3.5" strokeWidth={3} />
          {cat.wrong}
        </span>
        <span className={`${statusItem} text-[#9CA3AF] dark:text-slate-500`}>
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
          {cat.skipped}
        </span>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-36">
        <AccuracyBar value={cat.accuracy} />
        <span className="w-9 shrink-0 text-right text-[12px] font-extrabold text-[#1CB0F6]">{cat.accuracy}%</span>
      </div>
      <button
        type="button"
        onClick={() => onOpenQuestionList(cat.questionIds)}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-2.5 text-[12px] font-extrabold leading-none text-[#129BDC] transition hover:bg-[#D6F0FD] active:translate-y-[1px] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
      >
        <ListChecks className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span className="hidden md:inline">{t.questionList}</span>
      </button>
    </div>
  )
}

function TotalRow({ stats, t }: { stats: ToeicResultStats; t: ToeicResultCopy }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] border-2 border-[#1CB0F6] bg-[#E8F7FE] px-3.5 py-2.5 dark:border-sky-500/40 dark:bg-sky-500/10">
      <div className="min-w-[160px] flex-1">
        <p className="text-[13px] font-extrabold leading-5 text-[#129BDC] dark:text-sky-300">
          {t.total} ({stats.total.total} {t.totalUnit})
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#129BDC]/80 dark:text-sky-300/80">{t.clickToViewTip}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`${statusItem} text-emerald-700 dark:text-emerald-300`}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          {stats.total.correct}
        </span>
        <span className={`${statusItem} text-rose-600 dark:text-rose-300`}>
          <X className="h-3.5 w-3.5" strokeWidth={3} />
          {stats.total.wrong}
        </span>
        <span className={`${statusItem} text-[#9CA3AF] dark:text-slate-500`}>
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
          {stats.total.skipped}
        </span>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-36">
        <AccuracyBar value={stats.total.accuracy} />
        <span className="w-9 shrink-0 text-right text-[12px] font-extrabold text-[#129BDC]">{stats.total.accuracy}%</span>
      </div>
    </div>
  )
}

export function ToeicCategoryTable({ stats, t, lang, onOpenQuestionList }: Props) {
  const partNums = stats.parts.map((p) => p.partNum).sort((a, b) => a - b)
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const isOverview = activeTab === "overview"
  const visible = isOverview ? stats.categories : stats.categories.filter((c) => c.partNum === activeTab)
  const activePart = isOverview ? undefined : stats.parts.find((p) => p.partNum === activeTab)

  const segClass = (active: boolean) =>
    active
      ? "rounded-full bg-[#1CB0F6] px-3 py-1.5 text-[12px] font-extrabold leading-none text-white shadow-[0_2px_0_#189CD8]"
      : "rounded-full px-3 py-1.5 text-[12px] font-extrabold leading-none text-[#777777] transition hover:bg-white hover:text-[#1CB0F6] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-sky-300"

  return (
    <section className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="lp-section-heading mb-0 text-[18px]">{t.category}</h3>
        <div className="-mb-1 max-w-full overflow-x-auto pb-1">
          <div
            role="tablist"
            aria-label={t.category}
            className="flex w-max items-center gap-1 rounded-full border-2 border-[#E5E5E5] bg-[#F6F7FB] p-1 dark:border-white/10 dark:bg-white/5"
          >
            <button type="button" role="tab" aria-selected={isOverview} onClick={() => setActiveTab("overview")} className={segClass(isOverview)}>
              {t.overview}
            </button>
            {partNums.map((n) => (
              <button key={n} type="button" role="tab" aria-selected={activeTab === n} onClick={() => setActiveTab(n)} className={segClass(activeTab === n)}>
                {t.partLabel} {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activePart ? <PartSummary part={activePart} t={t} /> : null}

      <div className="mt-4 space-y-2">
        {isOverview && stats.categories.length > 0 ? <Legend t={t} /> : null}
        {visible.map((cat) => (
          <CategoryRow key={`${cat.partNum}:${cat.key}`} cat={cat} t={t} lang={lang} onOpenQuestionList={onOpenQuestionList} />
        ))}
        {isOverview && stats.categories.length > 0 ? <TotalRow stats={stats} t={t} /> : null}
        {visible.length === 0 ? (
          <p className="rounded-[12px] bg-[#F6F7FB] px-4 py-6 text-center text-[12px] font-semibold text-[#777777] dark:bg-white/5 dark:text-slate-400">
            {t.emptyCategory}
          </p>
        ) : null}
      </div>
    </section>
  )
}
