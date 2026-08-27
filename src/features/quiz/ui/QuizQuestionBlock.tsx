import { memo, useState } from "react"
import { cn } from "@/lib/utils"
import { isAnswerCorrect } from "@/features/quiz/lib/quizHelpers"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"
import { DetailedAnalysisContent } from "@/features/quiz/ui/DetailedAnalysisContent"
import { quizCopy } from "@/shared/i18n"

export const QuizQuestionBlock = memo(function QuizQuestionBlock({
  question,
  questionNumber,
  selected,
  isPractice,
  compact = false,
  t,
  onAnswer,
}: {
  question: Question
  questionNumber: number
  selected: AnswerValue | undefined
  isPractice: boolean
  compact?: boolean
  t: (typeof quizCopy)["en" | "vi"]
  onAnswer: (questionId: string, answer: AnswerValue) => void
}) {
  const isTextResponse = question.options.length === 0
  const textAnswer = typeof selected === "string" ? selected : ""
  const textCorrect = isAnswerCorrect(question, selected)
  const [showDetail, setShowDetail] = useState(false)

  return (
    <section className={cn("border-b border-[#E5E5E5] pb-8 last:border-b-0 last:pb-0 dark:border-white/10", compact && "pb-5")}>
      <p className="lp-label mb-2 text-[12px] uppercase tracking-[0.12em]">{t.question} {questionNumber}</p>
      <h2 className={cn(compact ? "text-[13px] leading-5 font-bold tracking-normal sm:text-[13px]" : "lp-card-title text-[18px] leading-8 sm:text-[20px]")}>{question.prompt}</h2>
      <div className={cn("mt-5 flex flex-col gap-3", compact && "mt-3 gap-1.5 sm:grid sm:grid-cols-2 sm:gap-2")}>
        {isTextResponse ? (
          <>
            <input type="text" value={textAnswer} onChange={(event) => onAnswer(question.id, event.target.value)} placeholder={t.typeAnswer} className={cn("w-full rounded-[12px] border-2 bg-white px-4 py-3.5 text-[15px] font-semibold outline-none transition-colors dark:bg-slate-900", compact && "max-w-md px-3 py-2.5 text-[14px] sm:col-span-2", isPractice && textAnswer ? (textCorrect ? "border-emerald-500 text-emerald-800 dark:text-emerald-100" : "border-rose-400 text-rose-800 dark:text-rose-100") : "border-[#E5E5E5] text-[#4B4B4B] focus:border-[#1CB0F6] dark:border-white/10 dark:text-slate-200")} />
            {isPractice && textAnswer ? <p className={cn("rounded-[12px] px-4 py-3 text-[13px] font-semibold", compact && "sm:col-span-2", textCorrect ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100" : "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-100")}>{textCorrect ? t.rightAnswer : `${t.rightAnswer}: ${question.acceptedAnswers?.join(" / ")}`}</p> : null}
          </>
        ) : question.options.map((option, index) => {
          const isSelected = selected === index
          const isCorrect = index === question.correctIndex
          const reveal = isPractice && selected !== undefined
          const isRevealCorrect = reveal && isCorrect
          const isRevealWrong = reveal && isSelected && !isCorrect
          return (
            <button key={`${question.id}-${index}`} type="button" onClick={() => onAnswer(question.id, index)} className={cn("flex w-full items-center gap-3 rounded-[12px] border-2 px-4 py-3.5 text-left font-semibold transition-all duration-100", compact && "gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12px] shadow-none sm:gap-2 sm:px-3 sm:py-2", !reveal && (isSelected ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_3px_0_#189CD8]" : "border-[#E5E5E5] bg-white text-[#4B4B4B] shadow-[0_3px_0_#DCDCDC] hover:-translate-y-px dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"), reveal && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_3px_0_#86efac] dark:bg-emerald-500/10 dark:text-emerald-100", reveal && isSelected && !isCorrect && "border-rose-400 bg-rose-50 text-rose-800 shadow-[0_3px_0_#fda4af] dark:bg-rose-500/10 dark:text-rose-100", reveal && !isSelected && !isCorrect && "border-[#E5E5E5] bg-white text-[#777777] shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-white/5 dark:text-slate-300")}>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-extrabold",
                  compact && "h-5 w-5 sm:h-6 sm:w-6",
                  isRevealCorrect
                    ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-white"
                    : isRevealWrong
                      ? "border-rose-400 bg-rose-400 text-white dark:border-rose-400 dark:bg-rose-400 dark:text-white"
                      : isSelected
                        ? "border-white/40 bg-white/15 text-white text-[12px] sm:text-[10px]"
                        : "border-[#E5E5E5] bg-[#F6F7FB] text-[#100F3E] dark:border-white/15 dark:bg-transparent dark:text-white text-[12px] sm:text-[10px]",
                  !isRevealCorrect && !isRevealWrong && (compact ? "text-[9px] sm:text-[10px]" : "text-[12px]")
                )}
              >
                {isRevealCorrect ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-full w-full shrink-0 scale-[1.2]"
                    aria-hidden="true"
                  >
                    <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" />
                    <path d="M8 12.5L10.5 15L16 9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isRevealWrong ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-full w-full shrink-0 scale-[1.2]"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9 9L15 15M15 9L9 15" />
                  </svg>
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>
              <span className={cn("flex-1 text-[14px] font-bold sm:text-[15px]", compact && "text-[12px] leading-4 sm:text-[12px]")}>{option}</span>
            </button>
          )
        })}
        {isPractice && selected !== undefined && (question.explanation || question.detailedExplanation) ? (
          <div className={cn("flex flex-col gap-2", compact && "sm:col-span-2")}>
            {question.explanation ? (
              <div className={cn("lp-modal-desc rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3.5 text-[13px] text-[#100F3E] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100", compact && "px-3 py-2.5")}>
                <span className="font-extrabold text-[#1CB0F6]">{t.explanation}: </span>
                <span className="whitespace-pre-line">{question.explanation}</span>
              </div>
            ) : null}
            {question.detailedExplanation ? (
              <div
                className={cn(
                  "overflow-hidden rounded-[16px] border-2 bg-white shadow-[0_3px_0_#DCDCDC] dark:bg-slate-900",
                  "border-[#B3E5FC] dark:border-sky-500/30",
                  compact && "rounded-[12px] shadow-none"
                )}
              >
                <button
                  type="button"
                  onClick={() => setShowDetail((v) => !v)}
                  className={cn(
                    "flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors",
                    compact && "px-3 py-2.5",
                    showDetail ? "bg-[#E8F7FE] dark:bg-sky-500/10" : "bg-white hover:bg-[#F6F7FB] dark:bg-slate-900 dark:hover:bg-white/5"
                  )}
                  aria-expanded={showDetail}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/20 dark:text-sky-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles h-3 w-3" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>
                    </span>
                    <span className="text-[13px] font-extrabold tracking-[-0.01em] text-[#100F3E] dark:text-white">
                      {t.detailedExplanation}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[16px] font-bold leading-none transition-all",
                      showDetail
                        ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8] dark:border-[#1CB0F6] dark:bg-[#1CB0F6]"
                        : "border-[#E5E5E5] bg-white text-[#1CB0F6] dark:border-white/15 dark:bg-white/10 dark:text-white"
                    )}
                  >
                    {showDetail ? "−" : "+"}
                  </span>
                </button>
                {showDetail ? (
                  <div className="border-t-2 border-[#B3E5FC] bg-[#F6F7FB] px-5 py-4 dark:border-sky-500/20 dark:bg-white/5">
                    <DetailedAnalysisContent content={question.detailedExplanation} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
})
