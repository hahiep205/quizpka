import { useMemo } from "react"
import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"
import type { ToeicScope } from "@/data/toeic"
import { formatClockTime } from "@/features/quiz/lib/quizHelpers"
import { getToeicResultStats } from "@/features/quiz/lib/toeicResultStats"
import { ToeicResultSummary } from "./ToeicResultSummary"
import { ToeicSectionScores } from "./ToeicSectionScores"
import { ToeicPartBreakdown } from "./ToeicPartBreakdown"
import { ToeicCategoryTable } from "./ToeicCategoryTable"
import { ToeicAnswerLookup } from "./ToeicAnswerLookup"
import type { ToeicResultCopy } from "./toeicResultShared"

type Props = {
  questions: Question[]
  answers: Record<string, AnswerValue>
  elapsedSeconds: number
  toeicScope: ToeicScope | undefined
  questionNumberMap: Map<string, number>
  t: ToeicResultCopy
  lang: "en" | "vi"
  score10: number
  isExam: boolean
  modeLabel: string
  resultTitle: string
  examTitle: string
  exitLabel: string
  reviewLabel: string
  retryWrongLabel: string | null
  retryWrongDisabled: boolean
  onExit: () => void
  onRetryWrong: (() => void) | null
  onReview: (questionId?: string) => void
  onOpenQuestionList: (questionIds: string[]) => void
}

export function ToeicResultPanel({
  questions,
  answers,
  elapsedSeconds,
  toeicScope,
  questionNumberMap,
  t,
  lang,
  score10,
  isExam,
  modeLabel,
  resultTitle,
  examTitle,
  exitLabel,
  reviewLabel,
  retryWrongLabel,
  retryWrongDisabled,
  onExit,
  onRetryWrong,
  onReview,
  onOpenQuestionList,
}: Props) {
  const stats = useMemo(() => getToeicResultStats(questions, answers, questionNumberMap), [answers, questionNumberMap, questions])
  const duration = formatClockTime(elapsedSeconds)
  const showListening = toeicScope !== "reading"
  const showReading = toeicScope !== "listening"
  const heroScore =
    toeicScope === "listening" ? stats.sectionScores.listening
    : toeicScope === "reading" ? stats.sectionScores.reading
    : stats.sectionScores.total

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-4 px-6 py-8 lg:px-8">
      <header>
        <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{modeLabel}</p>
        <h1 className="lp-section-heading mt-1 text-[24px] sm:text-[28px]">{resultTitle}</h1>
        <p className="lp-modal-desc mt-1">{examTitle}</p>
      </header>
      <ToeicResultSummary stats={stats} duration={duration} t={t} heroScore={heroScore} isExam={isExam} score10={score10} />
      <ToeicSectionScores stats={stats} t={t} showListening={showListening} showReading={showReading} />
      <ToeicPartBreakdown stats={stats} t={t} showListening={showListening} showReading={showReading} />
      <ToeicCategoryTable stats={stats} t={t} lang={lang} onOpenQuestionList={onOpenQuestionList} />
      <ToeicAnswerLookup questions={questions} answers={answers} numberMap={questionNumberMap} partRanges={stats.partRanges} t={t} lang={lang} />
      <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}>{exitLabel}</button>
        {onRetryWrong ? (
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm disabled:opacity-50" disabled={retryWrongDisabled} onClick={onRetryWrong}>{retryWrongLabel}</button>
        ) : null}
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => onReview()}>{reviewLabel}</button>
      </footer>
    </div>
  )
}
