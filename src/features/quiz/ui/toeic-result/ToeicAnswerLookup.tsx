import { useEffect, useMemo, useState } from "react"
import { BookOpen, Check, Minus, Sparkles, X } from "lucide-react"
import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"
import { getToeicPartNumber } from "@/features/quiz/lib/toeicCategories"
import type { ToeicPartRange } from "@/features/quiz/lib/toeicResultStats"
import { quizCopy } from "@/shared/i18n"
import { DetailedAnalysisContent } from "@/features/quiz/ui/DetailedAnalysisContent"
import { getToeicAnswerStatus, getAnswerLabel, type ToeicAnswerStatus, type ToeicResultCopy } from "./toeicResultShared"

type Props = {
  questions: Question[]
  answers: Record<string, AnswerValue>
  numberMap: Map<string, number>
  partRanges: ToeicPartRange[]
  t: ToeicResultCopy
  lang: "en" | "vi"
}

const TILE_STYLE: Record<ToeicAnswerStatus, string> = {
  correct:
    "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25",
  wrong:
    "border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25",
  skipped:
    "border-[#E5E5E5] bg-[#F0F1F5] text-[#8A8F9E] hover:bg-[#E8E9EF] dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10",
}

const CHIP_STYLE: Record<ToeicAnswerStatus, string> = {
  correct: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  wrong: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  skipped: "bg-[#F0F1F5] text-[#777777] dark:bg-white/10 dark:text-slate-400",
}

const LEGEND_ICON_STYLE: Record<ToeicAnswerStatus, string> = {
  correct: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  wrong: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300",
  skipped: "border-[#E5E5E5] bg-[#F0F1F5] text-[#8A8F9E] dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
}


function StatusIcon({ status }: { status: ToeicAnswerStatus }) {
  if (status === "correct") return <Check className="h-3.5 w-3.5" strokeWidth={3} />
  if (status === "wrong") return <X className="h-3.5 w-3.5" strokeWidth={3} />
  return <Minus className="h-3.5 w-3.5" strokeWidth={3} />
}

function correctLetter(q: Question): string | null {
  if (q.correctIndex !== undefined && q.correctIndex >= 0 && q.correctIndex < q.options.length) {
    return String.fromCharCode(65 + q.correctIndex)
  }
  if (q.acceptedAnswers && q.acceptedAnswers.length > 0) return q.acceptedAnswers.join(", ")
  return null
}

type ModalState = { question: Question; number: number; partNum: number; status: ToeicAnswerStatus }

function QuestionModal({
  state,
  answer,
  t,
  qc,
  onClose,
}: {
  state: ModalState
  answer: AnswerValue | undefined
  t: ToeicResultCopy
  qc: (typeof quizCopy)["en" | "vi"]
  onClose: () => void
}) {
  const { question, number, partNum, status } = state
  const answerLabel = getAnswerLabel(answer)
  const right = correctLetter(question)
  const statusText = answerLabel ? `${answerLabel} ${t[`${status}Suffix` as "correctSuffix"]}` : t[`${status}Suffix` as "correctSuffix"]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t.partLabel} ${partNum} - ${t.question} ${number}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#100F3E]/50 backdrop-blur-[2px]" />
      <div
        className="relative flex max-h-[min(88vh,780px)] w-full max-w-[540px] flex-col overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_16px_48px_rgba(16,15,62,0.28)] dark:border-white/10 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[16px] font-extrabold tracking-[-0.01em] text-[#100F3E] dark:text-white">
              {t.partLabel} {partNum}
              <span className="mx-1.5 text-[#C7CCD6]">•</span>
              {t.question} {number}
            </p>
            <button type="button" onClick={onClose} aria-label={t.close} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0F1F5] text-[#777777] transition-colors hover:bg-[#E5E6EC] hover:text-[#100F3E] dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20">
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-extrabold ${CHIP_STYLE[status]}`}>
            <StatusIcon status={status} />
            {statusText}
          </span>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 pb-5">
          {question.passage ? (
            <div className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] dark:border-white/10 dark:bg-white/5">
              <p className="flex items-center gap-2 border-b-2 border-[#E5E5E5] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#777777] dark:border-white/10 dark:text-slate-300">
                <BookOpen className="h-3.5 w-3.5 text-[#1CB0F6]" strokeWidth={2.5} />
                {t.passage}
              </p>
              <div className="max-h-52 overflow-y-auto px-4 py-3">
                <p className="whitespace-pre-line text-[13px] font-medium leading-6 text-[#4B4B4B] dark:text-slate-300">{question.passage}</p>
              </div>
            </div>
          ) : null}
          <div className="space-y-2 rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 text-[13px] font-bold leading-6 text-[#100F3E] dark:border-white/10 dark:bg-white/5 dark:text-white">
            <p>
              {t.answer} <span className={status === "correct" ? "text-emerald-700 dark:text-emerald-300" : status === "wrong" ? "text-rose-600 dark:text-rose-300" : "text-[#777777] dark:text-slate-400"}>{answerLabel || t.skippedSuffix}</span>
            </p>
            {right ? (
              <p>
                {t.correctAnswer} <span className="text-[#1CB0F6]">{right}</span>
              </p>
            ) : null}
          </div>
          {question.prompt ? (
            <p className="whitespace-pre-line text-[13.5px] font-semibold italic leading-6 text-[#100F3E] dark:text-slate-100">{question.prompt}</p>
          ) : null}
          {question.options.length > 0 ? (
            <div className="space-y-1.5">
              {question.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index)
                const isCorrect = question.correctIndex === index
                const isUserPick = typeof answer === "number" && answer === index
                const pickedWrong = status === "wrong" && isUserPick
                return (
                  <div key={index} className={`flex items-start gap-2.5 rounded-[10px] border-2 px-3 py-2 text-[13px] font-semibold leading-5 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100" : pickedWrong ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100" : "border-[#E5E5E5] bg-white text-[#4B4B4B] dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"}`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${isCorrect ? "bg-emerald-500 text-white" : pickedWrong ? "bg-rose-500 text-white" : "bg-[#F0F1F5] text-[#777777] dark:bg-white/10 dark:text-slate-300"}`}>{letter}</span>
                    <span className="flex-1">{option}</span>
                    {isCorrect ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={3} /> : pickedWrong ? <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={3} /> : null}
                  </div>
                )
              })}
            </div>
          ) : null}
          {question.explanation ? (
            <div className="rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#129BDC] dark:text-sky-300">{qc.explanation}</p>
              <p className="mt-1 whitespace-pre-line text-[13px] font-medium leading-6 text-[#100F3E] dark:text-sky-100">{question.explanation}</p>
            </div>
          ) : null}
          {question.detailedExplanation ? (
            <div>
              <p className="flex items-center gap-2 text-[13px] font-extrabold tracking-[-0.01em] text-[#100F3E] dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/20 dark:text-sky-300">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                {qc.detailedExplanation}
              </p>
              <div className="mt-2.5">
                <DetailedAnalysisContent content={question.detailedExplanation} t={qc} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Legend({ t }: { t: ToeicResultCopy }) {
  const items: Array<{ status: ToeicAnswerStatus; label: string }> = [
    { status: "correct", label: t.correctShort },
    { status: "wrong", label: t.wrongShort },
    { status: "skipped", label: t.skippedShort },
  ]
  return (
    <div className="flex items-center gap-2 rounded-full border-2 border-[#E5E5E5] bg-[#F6F7FB] px-3.5 py-1.5 dark:border-white/10 dark:bg-white/5">
      {items.map((item) => (
        <span key={item.status} className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#777777] dark:text-slate-300">
          <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] border-2 ${LEGEND_ICON_STYLE[item.status]}`}>
            <StatusIcon status={item.status} />
          </span>
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function ToeicAnswerLookup({ questions, answers, numberMap, partRanges, t, lang }: Props) {
  const qc = quizCopy[lang]
  const [activeId, setActiveId] = useState<string | null>(null)

  const questionsByPart = useMemo(() => {
    const map = new Map<number, Question[]>()
    for (const q of questions) {
      const n = getToeicPartNumber(q)
      if (n === null) continue
      const list = map.get(n) ?? []
      list.push(q)
      map.set(n, list)
    }
    for (const list of map.values()) list.sort((a, b) => (numberMap.get(a.id) ?? 0) - (numberMap.get(b.id) ?? 0))
    return map
  }, [numberMap, questions])

  const activeModal = useMemo<ModalState | null>(() => {
    if (!activeId) return null
    const question = questions.find((q) => q.id === activeId)
    if (!question) return null
    const partNum = getToeicPartNumber(question) ?? 0
    return {
      question,
      partNum,
      number: numberMap.get(question.id) ?? 0,
      status: getToeicAnswerStatus(question, answers),
    }
  }, [activeId, answers, numberMap, questions])

  useEffect(() => {
    if (!activeModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null)
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [activeModal])

  const toggle = (id: string) => setActiveId((prev) => (prev === id ? null : id))

  return (
    <section className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="lp-section-heading text-[18px]">{t.answerLookup}</h3>
          <p className="lp-modal-desc mt-1">{t.answerLookupDesc}</p>
        </div>
        <Legend t={t} />
      </div>
      <div className="mt-4 rounded-[12px] border-2 border-[#F2C94C] bg-[#FDE9C8] px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="flex items-start gap-2 text-[12px] font-bold leading-5 text-[#B45309] dark:text-amber-300">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span><span className="font-extrabold">{t.reviewTipTitle}</span> {t.reviewTipBody}</span>
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {partRanges.map((range) => {
          const partQuestions = questionsByPart.get(range.partNum) ?? []
          return (
            <div key={range.partNum} className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4">
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-[#100F3E] dark:text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F7FE] text-[11px] font-extrabold text-[#1CB0F6] dark:bg-sky-500/10 dark:text-sky-300">{range.partNum}</span>
                  {t.partLabel} {range.partNum}
                  <span className="text-[12px] font-semibold text-[#777777] dark:text-slate-400">{t.question} {range.start}–{range.end}</span>
                </p>
                <span className="shrink-0 rounded-full bg-[#E8F7FE] px-2.5 py-1 text-[11px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
                  {range.correct}/{range.count} {t.correctOfUnit}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 border-t-2 border-[#E5E5E5] bg-[#F6F7FB] px-3.5 py-3 dark:border-white/10 dark:bg-white/5 sm:px-4">
                {partQuestions.length === 0 ? (
                  <p className="text-[12px] font-semibold text-[#777777] dark:text-slate-400">{t.emptyCategory}</p>
                ) : (
                  partQuestions.map((q, idx) => {
                    const status = getToeicAnswerStatus(q, answers)
                    const number = numberMap.get(q.id) ?? range.start + idx
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => toggle(q.id)}
                        aria-label={`${t.question} ${number} ${t[`${status}Suffix` as "correctSuffix"]}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-[9px] border-2 text-[13px] font-extrabold transition-transform duration-150 hover:scale-105 active:scale-95 ${TILE_STYLE[status]}`}
                      >
                        {number}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
      {activeModal ? (
        <QuestionModal state={activeModal} answer={answers[activeModal.question.id]} t={t} qc={qc} onClose={() => setActiveId(null)} />
      ) : null}
    </section>
  )
}