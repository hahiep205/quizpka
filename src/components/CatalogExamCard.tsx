import { BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ExamMetaRow } from "@/components/ExamMetaRow"
import type { ExamCatalogItem } from "@/data/subjects"
import type { ReactNode } from "react"

type Lang = "en" | "vi"

export function CatalogExamCard({
  exam,
  lang,
  attemptCount,
  categoryLabel,
  questionsLabel,
  minutesLabel,
  footer,
}: {
  exam: ExamCatalogItem
  lang: Lang
  attemptCount: number
  categoryLabel: string
  questionsLabel: string
  minutesLabel: string
  footer: ReactNode
}) {
  return (
    <article className="group flex h-full flex-col rounded-[15px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:rounded-[16px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300 sm:h-12 sm:w-12 sm:rounded-[14px]">
          <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
        </div>
        <Badge className="border-0 bg-[#E8F7FE] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
          {categoryLabel}
        </Badge>
      </div>
      <div className="mt-4 flex-1 sm:mt-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1CB0F6]">{exam.subjectCode}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[17px] font-black leading-6 tracking-[-0.02em] text-[#100F3E] dark:text-white sm:mt-2 sm:text-lg">
          {exam.title[lang]}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {exam.description[lang]}
        </p>
      </div>
      <ExamMetaRow
        questionCount={exam.questionCount}
        durationMinutes={exam.durationMinutes}
        attemptCount={attemptCount}
        questionsLabel={questionsLabel}
        minutesLabel={minutesLabel}
        lang={lang}
        className="mt-5 border-t border-slate-100 pt-4 text-[11px] font-bold text-[#129BDC] dark:border-white/10 dark:text-sky-300 sm:text-xs"
      />
      {footer}
    </article>
  )
}
