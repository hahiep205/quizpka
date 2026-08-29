import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"
import { DetailedAnalysisContent } from "@/features/quiz/ui/DetailedAnalysisContent"
import { quizCopy } from "@/shared/i18n"

export function ReviewPanel({ t, questions, answers, hideExplanation = false, initialQuestionId, filteredQuestionIds, numberMap, onClose }: {
  t: (typeof quizCopy)["en" | "vi"]
  questions: Question[]
  answers: Record<string, AnswerValue>
  hideExplanation?: boolean
  initialQuestionId?: string
  filteredQuestionIds?: string[]
  numberMap?: Map<string, number>
  onClose: () => void
}) {
  const visibleQuestions = filteredQuestionIds ? questions.filter((q) => filteredQuestionIds.includes(q.id)) : questions
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (!initialQuestionId) return {}
    const initial: Record<string, boolean> = {}
    const target = questions.find((q) => q.id === initialQuestionId)
    if (target?.detailedExplanation) initial[target.id] = true
    return initial
  })
  useEffect(() => {
    if (!initialQuestionId) return
    const el = document.getElementById(`review-question-${initialQuestionId}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [initialQuestionId])
  return (
    <Dialog open onClose={onClose} title={t.review} closeLabel={t.closeReview} className="z-[100]" panelClassName="flex max-h-[min(820px,92vh)] w-full max-w-[760px] flex-col overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4 dark:border-white/10 sm:px-6">
          <h3 className="lp-modal-title text-[20px]">{t.review}</h3>
          <button type="button" onClick={onClose} className="lp-btn lp-btn--secondary lp-btn--icon"><X className="h-4 w-4" strokeWidth={2} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {visibleQuestions.map((question, index) => {
            const selected = answers[question.id]
            const questionNumber = numberMap?.get(question.id) ?? index + 1
            return (
              <div key={question.id} id={`review-question-${question.id}`} className="rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] p-4 dark:border-white/10 dark:bg-white/5">
                <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{t.question} {questionNumber}</p>
                <p className="lp-card-title mt-2 text-[15px] leading-6">{question.prompt}</p>
                <div className="mt-3 space-y-2 text-[13px] leading-6">
                  <p className="lp-card-desc"><span className="font-extrabold text-[#100F3E] dark:text-white">{t.yourAnswer}:</span>{" "}{selected === undefined ? t.noAnswer : typeof selected === "string" ? selected : `${String.fromCharCode(65 + selected)}. ${question.options[selected]}`}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300"><span className="font-extrabold">{t.rightAnswer}:</span>{" "}{question.correctIndex === undefined ? question.acceptedAnswers?.join(" / ") : `${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}`}</p>
                  {!hideExplanation && question.explanation ? (<p className="lp-modal-desc whitespace-pre-line text-[#100F3E] dark:text-sky-100"><span className="font-extrabold text-[#1CB0F6]">{t.explanation}:</span>{" "}{question.explanation}</p>) : null}
                  {question.detailedExplanation ? (
                    <div className="overflow-hidden rounded-[16px] border-2 border-[#B3E5FC] bg-white shadow-[0_2px_0_#DCDCDC] dark:border-sky-500/30 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [question.id]: !prev[question.id] }))}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${expanded[question.id] ? "bg-[#E8F7FE] dark:bg-sky-500/10" : "bg-white hover:bg-[#F6F7FB] dark:bg-slate-900 dark:hover:bg-white/5"}`}
                        aria-expanded={!!expanded[question.id]}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/20 dark:text-sky-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles h-3 w-3" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>
                          </span>
                          <span className="text-[13px] font-extrabold tracking-[-0.01em] text-[#100F3E] dark:text-white">
                            {t.detailedExplanation}
                          </span>
                        </span>
                        <span
                          className={`ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[16px] font-bold leading-none transition-all ${expanded[question.id] ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8] dark:border-[#1CB0F6]" : "border-[#E5E5E5] bg-white text-[#1CB0F6] dark:border-white/15 dark:bg-white/10 dark:text-white"}`}
                        >
                          {expanded[question.id] ? "−" : "+"}
                        </span>
                      </button>
                      {expanded[question.id] ? (
                        <div className="border-t-2 border-[#B3E5FC] bg-[#F6F7FB] px-4 py-4 dark:border-sky-500/20 dark:bg-white/5">
                          <DetailedAnalysisContent content={question.detailedExplanation} t={t} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
        <div className="border-t border-[#E5E5E5] px-5 py-4 dark:border-white/10 sm:px-6">
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block" onClick={onClose}>{t.closeReview}</button>
        </div>
    </Dialog>
  )
}
