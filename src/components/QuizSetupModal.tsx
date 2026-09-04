import { useEffect, useId, useState, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import {
  getExamTitle,
  type ExamCatalogItem,
  type Subject,
} from "@/data/subjects"
import { cn } from "@/lib/utils"
import { isHardSupported } from "@/features/quiz/lib/quizHard"
import { quizSetupCopy as copy } from "@/shared/i18n"
import { PickerModalShell } from "@/components/PickerModalShell"

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
    <PickerModalShell
      titleId={titleId}
      title={t.title}
      subtitle={`${t.exam}: ${getExamTitle(exam, lang)}`}
      closeLabel={t.close}
      state={state}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>
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
        </>
      }
    >
      <div className="space-y-5">
          <OptionGroup label={t.questionOrder}>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", questionOrder === "original" && "is-active")}
              onClick={() => setQuestionOrder("original")}
            >
              {t.original}
            </button>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", questionOrder === "random" && "is-active")}
              onClick={() => setQuestionOrder("random")}
            >
              {t.random}
            </button>
          </OptionGroup>

          <OptionGroup label={t.answerOrder}>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", answerOrder === "original" && "is-active")}
              onClick={() => setAnswerOrder("original")}
            >
              {t.original}
            </button>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", answerOrder === "random" && "is-active")}
              onClick={() => setAnswerOrder("random")}
            >
              {t.random}
            </button>
          </OptionGroup>

          <OptionGroup label={t.mode}>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", mode === "practice" && "is-active")}
              onClick={() => setMode("practice")}
            >
              {t.practice}
            </button>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", mode === "exam" && "is-active")}
              onClick={() => setMode("exam")}
            >
              {t.examMode}
            </button>
            {isHardSupported(subject.id) ? (
              <button
                type="button"
                className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", mode === "hard" && "is-active")}
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
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", timeOption === "unlimited" && "is-active")}
              onClick={() => setTimeOption("unlimited")}
            >
              {t.unlimited}
            </button>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", timeOption === "midterm30" && "is-active")}
              onClick={() => setTimeOption("midterm30")}
            >
              {t.midterm30}
            </button>
            <button
              type="button"
              className={cn("lp-chip min-w-0 flex-1 whitespace-normal text-center leading-4", timeOption === "final60" && "is-active")}
              onClick={() => setTimeOption("final60")}
            >
              {t.final60}
            </button>
          </OptionGroup>

      </div>
    </PickerModalShell>
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


