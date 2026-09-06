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
  footer,
}: {
  exam: ExamCatalogItem
  lang: Lang
  attemptCount: number
  categoryLabel: string
  questionsLabel: string
  footer: ReactNode
}) {
  return (
    <article className="group flex h-full flex-col rounded-[15px] border-2 border-[#E5E5E5] bg-white p-3 shadow-[0_3px_0_#DCDCDC] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:rounded-[16px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-2 sm:items-start sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300 sm:h-12 sm:w-12 sm:rounded-[14px]">
          <BookOpen className="h-4 w-4 sm:h-6 sm:w-6" strokeWidth={2} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden sm:flex-none sm:contents">
          <Badge className="h-6 max-w-[70%] shrink-0 truncate border-0 bg-[#E8F7FE] px-2 text-[10px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300 sm:h-7 sm:max-w-none sm:px-3 sm:text-[12px]">
            {categoryLabel}
          </Badge>
        </div>
      </div>
      <div className="mt-3 min-w-0 flex-1 sm:mt-5">
        <p className="hidden text-xs font-extrabold uppercase tracking-[0.08em] text-[#1CB0F6] sm:block">{exam.subjectCode}</p>
        <h3 className="line-clamp-2 text-[14px] font-black leading-5 tracking-[-0.02em] text-[#100F3E] dark:text-white sm:mt-2 sm:text-lg sm:leading-6">
          {exam.title[lang]}
        </h3>
        <p className="mt-2 hidden line-clamp-2 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:block">
          {exam.description[lang]}
        </p>
      </div>
      <ExamMetaRow
        questionCount={exam.questionCount}
        attemptCount={attemptCount}
        questionsLabel={questionsLabel}
        lang={lang}
        className="mt-3 gap-x-2.5 border-t border-slate-100 pt-3 text-[10px] font-bold text-[#129BDC] dark:border-white/10 dark:text-sky-300 sm:mt-5 sm:gap-x-4 sm:pt-4 sm:text-xs"
      />
      {footer}
    </article>
  )
}
