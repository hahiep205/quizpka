import { Clock3, FileText, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

type Lang = "en" | "vi"

export function ExamMetaRow({
  questionCount,
  chapterCount,
  durationMinutes,
  questionsLabel,
  lang,
  className,
}: {
  questionCount: number
  chapterCount: number
  durationMinutes: number
  questionsLabel: string
  lang: Lang
  className?: string
}) {
  return (
    <div className={cn("flex flex-nowrap items-center gap-x-2 overflow-hidden", className)}>
      {questionCount > 0 ? (
        <span className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5">
          <FileText className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
          <span className="truncate whitespace-nowrap">{questionCount} {questionsLabel}</span>
        </span>
      ) : null}
      {chapterCount > 0 ? (
        <span className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5">
          <Layers className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
          <span className="truncate whitespace-nowrap">{chapterCount} {lang === "vi" ? "chương" : chapterCount === 1 ? "chapter" : "chapters"}</span>
        </span>
      ) : null}
      {durationMinutes > 0 ? (
        <span className="hidden min-w-0 items-center gap-1 sm:inline-flex sm:gap-1.5">
          <Clock3 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
          <span className="truncate whitespace-nowrap">{durationMinutes} {lang === "vi" ? "phút" : "min"}</span>
        </span>
      ) : null}
    </div>
  )
}
