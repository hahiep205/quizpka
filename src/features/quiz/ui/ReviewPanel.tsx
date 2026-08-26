import { useState } from "react"
import { X } from "lucide-react"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"
import { DetailedAnalysisContent } from "@/features/quiz/ui/DetailedAnalysisContent"

type Lang = "en" | "vi"

const copy = {
  en: {
    question: "Question",
    rightAnswer: "Correct answer",
    explanation: "Explanation",
    detailedExplanation: "Detailed Analysis",
    noAnswer: "No answer",
    closeReview: "Close review",
    review: "Review answers",
    yourAnswer: "Your answer",
  },
  vi: {
    question: "Câu",
    rightAnswer: "Đáp án đúng",
    explanation: "Giải thích",
    detailedExplanation: "Phân tích chi tiết",
    noAnswer: "Chưa chọn",
    closeReview: "Đóng xem lại",
    review: "Xem lại bài làm",
    yourAnswer: "Đáp án đã chọn",
  },
} as const

export function ReviewPanel({ t, questions, answers, onClose }: { t: (typeof copy)[Lang]; questions: Question[]; answers: Record<string, AnswerValue>; onClose: () => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]" data-state="open" onClick={onClose} />
      <div className="contact-modal-panel relative z-10 flex max-h-[min(820px,92vh)] w-full max-w-[760px] flex-col overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900" data-state="open">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4 dark:border-white/10 sm:px-6">
          <h3 className="lp-modal-title text-[20px]">{t.review}</h3>
          <button type="button" onClick={onClose} className="lp-btn lp-btn--secondary lp-btn--icon"><X className="h-4 w-4" strokeWidth={2} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {questions.map((question, index) => {
            const selected = answers[question.id]
            return (
              <div key={question.id} className="rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] p-4 dark:border-white/10 dark:bg-white/5">
                <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{t.question} {index + 1}</p>
                <p className="lp-card-title mt-2 text-[15px] leading-6">{question.prompt}</p>
                <div className="mt-3 space-y-2 text-[13px] leading-6">
                  <p className="lp-card-desc"><span className="font-extrabold text-[#100F3E] dark:text-white">{t.yourAnswer}:</span>{" "}{selected === undefined ? t.noAnswer : typeof selected === "string" ? selected : `${String.fromCharCode(65 + selected)}. ${question.options[selected]}`}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300"><span className="font-extrabold">{t.rightAnswer}:</span>{" "}{question.correctIndex === undefined ? question.acceptedAnswers?.join(" / ") : `${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}`}</p>
                  {question.explanation ? (<p className="lp-modal-desc whitespace-pre-line text-[#100F3E] dark:text-sky-100"><span className="font-extrabold text-[#1CB0F6]">{t.explanation}:</span>{" "}{question.explanation}</p>) : null}
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
                            {(t as unknown as { detailedExplanation?: string }).detailedExplanation ?? copy.vi.detailedExplanation}
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
                          <DetailedAnalysisContent content={question.detailedExplanation} />
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
      </div>
    </div>
  )
}
