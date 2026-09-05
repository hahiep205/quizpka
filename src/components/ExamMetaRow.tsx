import { CheckCircle2, Clock3, FileText } from "lucide-react"
import { formatSubjectAttemptLabel } from "@/lib/subjectAttemptStats"
import { cn } from "@/lib/utils"

type Lang = "en" | "vi"

export function ExamMetaRow({
  questionCount,
  durationMinutes,
  attemptCount,
  questionsLabel,
  minutesLabel,
  lang,
  className,
  hideDurationOnMobile = false,
}: {
  questionCount: number
  durationMinutes: number
  attemptCount: number
  questionsLabel: string
  minutesLabel: string
  lang: Lang
  className?: string
  hideDurationOnMobile?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-2", className)}>
      {questionCount > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {questionCount} {questionsLabel}
        </span>
      ) : null}
      {durationMinutes > 0 ? (
        <span className={cn("inline-flex items-center gap-1.5", hideDurationOnMobile && "hidden sm:inline-flex")}>
          <Clock3 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {durationMinutes} {minutesLabel}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {attemptCount.toLocaleString(lang === "vi" ? "vi-VN" : "en-US")} {formatSubjectAttemptLabel(attemptCount, lang)}
      </span>
    </div>
  )
}
