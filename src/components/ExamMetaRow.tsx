import { CheckCircle2, FileText } from "lucide-react"
import { formatSubjectAttemptLabel } from "@/lib/subjectAttemptStats"
import { cn } from "@/lib/utils"

type Lang = "en" | "vi"

export function ExamMetaRow({
  questionCount,
  attemptCount,
  questionsLabel,
  lang,
  className,
}: {
  questionCount: number
  attemptCount: number
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
      <span className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5">
        <CheckCircle2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
        <span className="truncate whitespace-nowrap">{attemptCount.toLocaleString(lang === "vi" ? "vi-VN" : "en-US")} {formatSubjectAttemptLabel(attemptCount, lang)}</span>
      </span>
    </div>
  )
}
