import { cn } from "@/lib/utils"
import { isAnswerCorrect } from "@/features/quiz/lib/quizHelpers"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"

type Lang = "en" | "vi"

const copy = {
  en: {
    question: "Question",
    explanation: "Explanation",
    rightAnswer: "Correct answer",
    typeAnswer: "Type your answer",
  },
  vi: {
    question: "Câu",
    explanation: "Giải thích",
    rightAnswer: "Đáp án đúng",
    typeAnswer: "Nhập câu trả lời",
  },
} as const

export function QuizQuestionBlock({
  question,
  questionNumber,
  answers,
  isPractice,
  compact = false,
  t,
  onAnswer,
}: {
  question: Question
  questionNumber: number
  answers: Record<string, AnswerValue>
  isPractice: boolean
  compact?: boolean
  t: (typeof copy)[Lang]
  onAnswer: (answer: AnswerValue) => void
}) {
  const selected = answers[question.id]
  const isTextResponse = question.options.length === 0
  const textAnswer = typeof selected === "string" ? selected : ""
  const textCorrect = isAnswerCorrect(question, selected)

  return (
    <section className={cn("border-b border-[#E5E5E5] pb-8 last:border-b-0 last:pb-0 dark:border-white/10", compact && "pb-5")}>
      <p className="lp-label mb-2 text-[12px] uppercase tracking-[0.12em]">{t.question} {questionNumber}</p>
      <h2 className={cn(compact ? "text-[13px] leading-5 font-bold tracking-normal sm:text-[13px]" : "lp-card-title text-[18px] leading-8 sm:text-[20px]")}>{question.prompt}</h2>
      <div className={cn("mt-5 flex flex-col gap-3", compact && "mt-3 gap-1.5 sm:grid sm:grid-cols-2 sm:gap-2")}>
        {isTextResponse ? (
          <>
            <input type="text" value={textAnswer} onChange={(event) => onAnswer(event.target.value)} placeholder={t.typeAnswer} className={cn("w-full rounded-[12px] border-2 bg-white px-4 py-3.5 text-[15px] font-semibold outline-none transition-colors dark:bg-slate-900", compact && "max-w-md px-3 py-2.5 text-[14px] sm:col-span-2", isPractice && textAnswer ? (textCorrect ? "border-emerald-500 text-emerald-800 dark:text-emerald-100" : "border-rose-400 text-rose-800 dark:text-rose-100") : "border-[#E5E5E5] text-[#4B4B4B] focus:border-[#1CB0F6] dark:border-white/10 dark:text-slate-200")} />
            {isPractice && textAnswer ? <p className={cn("rounded-[12px] px-4 py-3 text-[13px] font-semibold", compact && "sm:col-span-2", textCorrect ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100" : "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-100")}>{textCorrect ? t.rightAnswer : `${t.rightAnswer}: ${question.acceptedAnswers?.join(" / ")}`}</p> : null}
          </>
        ) : question.options.map((option, index) => {
          const isSelected = selected === index
          const isCorrect = index === question.correctIndex
          const reveal = isPractice && selected !== undefined
          return (
            <button key={`${question.id}-${index}`} type="button" onClick={() => onAnswer(index)} className={cn("flex w-full items-center gap-3 rounded-[12px] border-2 px-4 py-3.5 text-left font-semibold transition-all duration-100", compact && "gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12px] shadow-none sm:gap-2 sm:px-3 sm:py-2", !reveal && (isSelected ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_3px_0_#189CD8]" : "border-[#E5E5E5] bg-white text-[#4B4B4B] shadow-[0_3px_0_#DCDCDC] hover:-translate-y-px dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"), reveal && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_3px_0_#86efac] dark:bg-emerald-500/10 dark:text-emerald-100", reveal && isSelected && !isCorrect && "border-rose-400 bg-rose-50 text-rose-800 shadow-[0_3px_0_#fda4af] dark:bg-rose-500/10 dark:text-rose-100", reveal && !isSelected && !isCorrect && "border-[#E5E5E5] bg-white text-[#777777] shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-white/5 dark:text-slate-300")}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-extrabold", compact && "h-5 w-5 text-[9px] sm:h-6 sm:w-6 sm:text-[10px]", isSelected ? "border-white/40 bg-white/15 text-white" : "border-[#E5E5E5] bg-[#F6F7FB] text-[#100F3E] dark:border-white/15 dark:bg-transparent dark:text-white")}>{String.fromCharCode(65 + index)}</span>
              <span className={cn("flex-1 text-[14px] font-bold sm:text-[15px]", compact && "text-[12px] leading-4 sm:text-[12px]")}>{option}</span>
            </button>
          )
        })}
        {isPractice && selected !== undefined && question.explanation ? <div className={cn("lp-modal-desc rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3.5 text-[13px] text-[#100F3E] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100", compact && "sm:col-span-2 px-3 py-2.5")}>{<span className="font-extrabold text-[#1CB0F6]">{t.explanation}: </span>}{question.explanation}</div> : null}
      </div>
    </section>
  )
}
