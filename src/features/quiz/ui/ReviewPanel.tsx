import { X } from "lucide-react"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"

type Lang = "en" | "vi"

const copy = {
  en: {
    question: "Question",
    rightAnswer: "Correct answer",
    explanation: "Explanation",
    noAnswer: "No answer",
    closeReview: "Close review",
    review: "Review answers",
    yourAnswer: "Your answer",
  },
  vi: {
    question: "Câu",
    rightAnswer: "Đáp án đúng",
    explanation: "Giải thích",
    noAnswer: "Chưa chọn",
    closeReview: "Đóng xem lại",
    review: "Xem lại bài làm",
    yourAnswer: "Đáp án đã chọn",
  },
} as const

export function ReviewPanel({ t, questions, answers, onClose }: { t: (typeof copy)[Lang]; questions: Question[]; answers: Record<string, AnswerValue>; onClose: () => void }) {
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
                  {question.explanation ? (<p className="lp-modal-desc text-[#100F3E] dark:text-sky-100"><span className="font-extrabold text-[#1CB0F6]">{t.explanation}:</span>{" "}{question.explanation}</p>) : null}
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
