import { useState } from "react"
import { X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { cn, modalBodyClass, modalFooterClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"
import { submitSupportReport } from "@/features/support/api/supportReports"
import type { Question } from "@/features/quiz/model/quiz.types"
import { quizCopy } from "@/shared/i18n"

export type QuestionReportKind = "question" | "answer"

type T = (typeof quizCopy)["en" | "vi"]

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, Math.max(0, max - 1))}…` : clean
}

function WarningTriangleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M13.9248 21H10.0752C5.44476 21 3.12955 21 2.27636 19.4939C1.42317 17.9879 2.60736 15.9914 4.97574 11.9985L6.90057 8.75333C9.17559 4.91778 10.3131 3 12 3C13.6869 3 14.8244 4.91777 17.0994 8.75332L19.0243 11.9985C21.3926 15.9914 22.5768 17.9879 21.7236 19.4939C20.8704 21 18.5552 21 13.9248 21Z"></path>
      <path d="M12 17V13"></path>
      <path d="M12 9.25H12.125M12.25 9.25C12.25 9.11193 12.1381 9 12 9C11.8619 9 11.75 9.11193 11.75 9.25C11.75 9.38807 11.8619 9.5 12 9.5C12.1381 9.5 12.25 9.38807 12.25 9.25Z"></path>
    </svg>
  )
}

export function QuestionReport({ question, questionNumber, examTitle, subjectName, signedIn, t }: {
  question: Question
  questionNumber: number
  examTitle: string
  subjectName: string
  signedIn: boolean
  t: T
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<QuestionReportKind | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const close = () => {
    setOpen(false)
    setKind(null)
    setSending(false)
    setResult(null)
  }

  const kinds: Array<{ id: QuestionReportKind; label: string }> = [
    { id: "question", label: t.reportOptionPrompt },
    { id: "answer", label: t.reportOptionAnswer },
  ]

  const handleConfirm = () => {
    if (!kind || sending || result?.ok) return
    setSending(true)
    setResult(null)
    const kindLabel = kinds.find((k) => k.id === kind)?.label ?? kind
    const correctText = question.correctIndex === undefined
      ? (question.acceptedAnswers?.join(" / ") ?? "")
      : `${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex] ?? ""}`
    const subject = truncate(`[${t.reportTitle}] ${examTitle} - ${t.question} ${questionNumber}: ${kindLabel}`, 160)
    const description = truncate(
      [
        `${t.reportTitle}: ${kindLabel}`,
        `${subjectName} — ${examTitle}`,
        `${t.question} ${questionNumber} (ID: ${question.id})`,
        `${question.prompt}`,
        question.options.length ? `${question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}` : undefined,
        correctText ? `${t.rightAnswer}: ${correctText}` : undefined,
      ].filter((line): line is string => Boolean(line)).join("\n\n"),
      4000,
    )
    void submitSupportReport({ type: "report", subject, description, pageUrl: window.location.href })
      .then(() => setResult({ ok: true, message: t.reportSent }))
      .catch((error: unknown) => setResult({ ok: false, message: error instanceof Error ? error.message : t.reportFailed }))
      .finally(() => setSending(false))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.reportButton}
        aria-label={`${t.reportButton} ${questionNumber}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition-colors hover:bg-[#E4E6EB] active:scale-95 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <WarningTriangleIcon className="h-[19px] w-[19px]" />
        </span>
      </button>
      <Dialog
        open={open}
        onClose={close}
        title={t.reportTitle}
        closeLabel={t.reportCancel}
        panelClassName={cn("max-w-[520px] rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 lp-modal-frame--auto", modalFrameClass)}
      >
        <div className={modalHeaderClass}>
          <h3 className="lp-modal-title text-[17px]">{t.reportTitle}</h3>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon h-8 w-8" onClick={close} aria-label={t.reportCancel}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className={cn(modalBodyClass, "space-y-3")}>
          <p className="whitespace-pre-line rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 text-[13px] font-semibold leading-6 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <span className="font-extrabold text-[#100F3E] dark:text-white">{t.question} {questionNumber}: </span>
            {truncate(question.prompt, 280)}
          </p>
          {!signedIn ? (
            <p role="status" className="rounded-[12px] border-2 border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              {t.reportLoginRequired}
            </p>
          ) : (
            <div role="radiogroup" aria-label={t.reportTitle} className="flex flex-col gap-2">
              {kinds.map((option) => {
                const selected = kind === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setKind(option.id); setResult(null) }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[12px] border-2 px-4 py-3 text-left text-[14px] font-bold transition-colors",
                      selected
                        ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
                        : "border-[#E5E5E5] bg-white text-[#4B4B4B] hover:border-amber-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200",
                    )}
                  >
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-amber-500" : "border-[#E5E5E5] dark:border-white/15",
                    )}>
                      {selected ? <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> : null}
                    </span>
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
          {result ? (
            <p role="status" className={cn(
              "rounded-[12px] px-4 py-3 text-[13px] font-bold",
              result.ok
                ? "border-2 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                : "border-2 border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
            )}>
              {result.message}
            </p>
          ) : null}
        </div>
        <div className={cn(modalFooterClass, "lp-modal-footer--compact")}>
          {result?.ok || !signedIn ? (
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block" onClick={close}>{t.continue}</button>
          ) : (
            <>
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={close}>{t.reportCancel}</button>
              <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" disabled={!kind || sending} onClick={handleConfirm}>
                {sending ? t.reportSending : t.reportConfirm}
              </button>
            </>
          )}
        </div>
      </Dialog>
    </>
  )
}
