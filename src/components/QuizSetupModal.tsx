import { useEffect, useId, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  getExamTitle,
  type ExamCatalogItem,
  type Subject,
} from "@/data/subjects"
import { cn } from "@/lib/utils"
import { isHardSupported } from "@/features/quiz/lib/quizHard"
import { quizSetupCopy as copy } from "@/shared/i18n"

type Lang = "en" | "vi"

export type QuizMode = "practice" | "exam" | "hard"
export type OrderMode = "original" | "random"
export type TimeOption = "unlimited" | "midterm30" | "final60"

export type QuizSetupValues = {
  questionOrder: OrderMode
  answerOrder: OrderMode
  mode: QuizMode
  timed: boolean
  durationMinutes: number
  questionLimit?: number
}

const EXAM_MIDTERM_LIMIT = 40
const EXAM_FINAL_LIMIT = 60

type QuizSetupModalProps = {
  open: boolean
  lang: Lang
  exam: ExamCatalogItem | null
  subject: Subject | null
  onClose: () => void
  onStart: (setup: QuizSetupValues) => void
}

export function QuizSetupModal({
  open,
  lang,
  exam,
  subject,
  onClose,
  onStart,
}: QuizSetupModalProps) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [questionOrder, setQuestionOrder] = useState<OrderMode>("original")
  const [answerOrder, setAnswerOrder] = useState<OrderMode>("original")
  const [mode, setMode] = useState<QuizMode>("practice")
  const [timeOption, setTimeOption] = useState<TimeOption>("final60")
  const t = copy[lang]

  useEffect(() => {
    if (open && exam) {
      setQuestionOrder("original")
      setAnswerOrder("original")
      setMode("practice")
      setTimeOption(exam.type === "midterm" ? "midterm30" : "final60")
      setVisible(true)
      setState("open")
      return
    }
    if (!visible) return
    setState("closed")
    const timer = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(timer)
  }, [open, exam, visible])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!visible || !exam || !subject) return null

  const timed = timeOption !== "unlimited"
  const durationMinutes =
    timeOption === "midterm30" ? 30 : timeOption === "final60" ? 60 : 0

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t.close}
        data-state={state}
        className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <Card
        variant="large"
        padding="none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        className="contact-modal-panel relative z-10 max-h-[min(760px,92vh)] w-full max-w-[480px] overflow-y-auto shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] px-6 py-5 dark:border-white/10">
          <div>
            <h2 id={titleId} className="lp-modal-title">
              {t.title}
            </h2>
            <p className="lp-modal-desc-spaced">
              {t.exam}: {getExamTitle(exam, lang)}
            </p>
          </div>
          <button
            type="button"
            className="lp-btn lp-btn--secondary lp-btn--icon"
            onClick={onClose}
            aria-label={t.close}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <OptionGroup label={t.questionOrder}>
            <button
              type="button"
              className={cn("lp-chip", questionOrder === "original" && "is-active")}
              onClick={() => setQuestionOrder("original")}
            >
              {t.original}
            </button>
            <button
              type="button"
              className={cn("lp-chip", questionOrder === "random" && "is-active")}
              onClick={() => setQuestionOrder("random")}
            >
              {t.random}
            </button>
          </OptionGroup>

          <OptionGroup label={t.answerOrder}>
            <button
              type="button"
              className={cn("lp-chip", answerOrder === "original" && "is-active")}
              onClick={() => setAnswerOrder("original")}
            >
              {t.original}
            </button>
            <button
              type="button"
              className={cn("lp-chip", answerOrder === "random" && "is-active")}
              onClick={() => setAnswerOrder("random")}
            >
              {t.random}
            </button>
          </OptionGroup>

          <OptionGroup label={t.mode}>
            <button
              type="button"
              className={cn("lp-chip", mode === "practice" && "is-active")}
              onClick={() => setMode("practice")}
            >
              {t.practice}
            </button>
            <button
              type="button"
              className={cn("lp-chip", mode === "exam" && "is-active")}
              onClick={() => setMode("exam")}
            >
              {t.examMode}
            </button>
            {isHardSupported(subject.id) ? (
              <button
                type="button"
                className={cn("lp-chip", mode === "hard" && "is-active")}
                onClick={() => setMode("hard")}
              >
                {t.hardMode}
              </button>
            ) : null}
            <p className="lp-modal-desc basis-full">{mode === "practice" ? t.practiceHint : mode === "hard" ? t.hardHint : t.examHint}</p>
          </OptionGroup>

          <OptionGroup label={t.time}>
            <button
              type="button"
              className={cn("lp-chip", timeOption === "unlimited" && "is-active")}
              onClick={() => setTimeOption("unlimited")}
            >
              {t.unlimited}
            </button>
            <button
              type="button"
              className={cn("lp-chip", timeOption === "midterm30" && "is-active")}
              onClick={() => setTimeOption("midterm30")}
            >
              {t.midterm30}
            </button>
            <button
              type="button"
              className={cn("lp-chip", timeOption === "final60" && "is-active")}
              onClick={() => setTimeOption("final60")}
            >
              {t.final60}
            </button>
          </OptionGroup>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="lp-btn lp-btn--secondary lp-btn--sm"
              onClick={onClose}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className="lp-btn lp-btn--primary lp-btn--sm"
              onClick={() =>
                onStart({
                  questionOrder,
                  answerOrder,
                  mode,
                  timed,
                  durationMinutes,
                  questionLimit:
                    mode === "exam"
                      ? exam.type === "midterm"
                        ? EXAM_MIDTERM_LIMIT
                        : EXAM_FINAL_LIMIT
                      : undefined,
                })
              }
            >
              {t.start}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function OptionGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <Label className="lp-label">{label}</Label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}


