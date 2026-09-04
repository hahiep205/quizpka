import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Play,
  RotateCcw,
} from "lucide-react"
import {
  getExamTitle,
  type ExamPaper,
  type Subject,
} from "@/data/subjects"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { quizCopy as copy, toeicResultCopy } from "@/shared/i18n"
import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"
import { shuffle, formatTime, isAnswerCorrect } from "@/features/quiz/lib/quizHelpers"
import type { ToeicScope } from "@/data/toeic"
import { getAnsweredCount, getIncorrectQuestions, getQuizStats } from "@/features/quiz/lib/quizSelectors"
import { useQuizQuestions } from "@/features/quiz/hooks/useQuizQuestions"
import { useQuizTimer } from "@/features/quiz/hooks/useQuizTimer"
import { useRetryHistory } from "@/features/quiz/hooks/useRetryHistory"
import { applyCorrect, applyWrong, buildHardQueue } from "@/features/quiz/lib/quizHard"
import {
  buildPartNavigationItems,
  buildPartStartIndices,
  buildQuestionNumberMap,
  buildToeicGroups,
  buildToeicTwoLevelData,
  getCurrentPartStartIndex,
  getPartKey,
  getPartQuestions,
  stripPart6GroupSuffix,
  type ToeicGroup,
} from "@/features/quiz/lib/quizGrouping"
import { QuizQuestionBlock } from "@/features/quiz/ui/QuizQuestionBlock"
import { QuizSidebar } from "@/features/quiz/ui/QuizSidebar"
import { ReviewPanel } from "@/features/quiz/ui/ReviewPanel"
import { ToeicResultPanel } from "@/features/quiz/ui/toeic-result/ToeicResultPanel"
import { shouldHideExplanation } from "@/features/quiz/lib/explanationVisibility"
import { StatCard } from "@/features/quiz/ui/StatCard"
import { CenterCard } from "@/features/quiz/ui/CenterCard"
import { ResultStamp } from "@/features/quiz/ui/ResultStamp"
import { Dialog } from "@/components/ui/dialog"
import { useAuth } from "@/auth/AuthProvider"
import { appRoutes } from "@/app/navigation"
import { savePracticeHistory } from "@/lib/practiceSession"
import { endAttemptSession, logActivityEvent, mirrorPracticeAttempt } from "@/features/activity/lib/activityLog"
import { incrementSubjectAttempt } from "@/lib/subjectAttemptStats"
import { playAnswerFeedback } from "@/features/quiz/lib/answerFeedbackSound"

type Lang = "en" | "vi"

type QuizSessionProps = {
  lang: Lang
  subject: Subject
  exam: ExamPaper
  setup: QuizSetupValues
  chapterId?: string
  toeicScope?: ToeicScope
  questionIds?: string[]
  retryOfHistoryId?: string
  retryNumber?: number
  onExit: () => void
}

export function QuizSession({ lang, subject, exam, setup, chapterId, toeicScope, questionIds, retryOfHistoryId, retryNumber, onExit }: QuizSessionProps) {
  const t = copy[lang]
  const { status, user } = useAuth()
  const hideExplanation = shouldHideExplanation(subject.id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [finished, setFinished] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewQuestionId, setReviewQuestionId] = useState<string | undefined>(undefined)
  const [reviewFilteredIds, setReviewFilteredIds] = useState<string[] | undefined>(undefined)
  const [transitionKey, setTransitionKey] = useState(0)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [forcePractice, setForcePractice] = useState(false)
  const [hardQueue, setHardQueue] = useState<Question[]>([])
  const [hardPos, setHardPos] = useState(0)
  const [hardMastered, setHardMastered] = useState(0)
  const [hardWrongCounts, setHardWrongCounts] = useState<Record<string, number>>({})
  const [hardSelected, setHardSelected] = useState<AnswerValue | undefined>(undefined)
  const [hardFinalAnswers, setHardFinalAnswers] = useState<Record<string, AnswerValue>>({})
  const [activeRetryNumber, setActiveRetryNumber] = useState(retryNumber)
  const historySaved = useRef(false)
  const retryRootHistoryId = useRef(retryOfHistoryId)
  const lastSavedHistoryId = useRef<string | undefined>(undefined)
  const retryStorageKey = `quiz-retry-${exam.id}-${chapterId ?? "all"}-${toeicScope ?? "noscope"}`
  const { questions, setQuestions, loading, error, reload } = useQuizQuestions({ subject, exam, setup, chapterId, toeicScope, questionIds })
  const { history: retryHistory, setHistory: setRetryHistory, clear: clearRetryHistory } = useRetryHistory(retryStorageKey)
  const handleTimeout = useCallback(() => setFinished(true), [])
  const { secondsLeft, elapsedSeconds, reset: resetTimer } = useQuizTimer({
    isRunning: !finished && !loading && !error && questions.length > 0,
    timed: setup.timed,
    durationMinutes: setup.durationMinutes,
    onTimeout: handleTimeout,
  })
  const isHard = setup.mode === "hard"

  useEffect(() => {
    if (!loading) return
    setCurrentIndex(0)
    setAnswers({})
    setFinished(false)
    setReviewOpen(false)
    setConfirmOpen(false)
    clearRetryHistory()
    setReviewQuestionId(undefined)
    setReviewFilteredIds(undefined)
    setForcePractice(false)
    resetTimer()
    setHardQueue([])
    setHardPos(0)
    setHardMastered(0)
    setHardWrongCounts({})
    setHardSelected(undefined)
    setHardFinalAnswers({})
  }, [clearRetryHistory, loading, resetTimer])

  // Build the Practice Hard queue once the question set is ready.
  useEffect(() => {
    if (!isHard || loading || questions.length === 0 || finished) return
    if (hardQueue.length === 0 && hardMastered === 0) {
      setHardQueue(buildHardQueue(questions, setup.questionOrder === "random"))
    }
  }, [finished, hardMastered, hardQueue.length, isHard, loading, questions, setup.questionOrder])

  const current = questions[currentIndex]
  const answeredCount = useMemo(() => getAnsweredCount(questions, answers), [answers, questions])
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0
  const stats = useMemo(() => getQuizStats(questions, answers), [answers, questions])
  const wrongQuestions = useMemo(() => getIncorrectQuestions(questions, answers), [questions, answers])
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])

  // Derived navigation data is memoized (and hoisted above the early returns) so the
  // sidebar tiles and question blocks can skip re-rendering while the timer ticks.
  const questionNumberMap = useMemo(() => buildQuestionNumberMap(questions), [questions])
  const currentPartKey = useMemo(() => (current ? getPartKey(current) : ""), [current])
  const partQuestions = useMemo(() => getPartQuestions(questions, currentPartKey), [currentPartKey, questions])
  const partQuestionIds = useMemo(() => new Set(partQuestions.map((question) => question.id)), [partQuestions])
  const partStartIndices = useMemo(() => buildPartStartIndices(questions), [questions])
  const currentPartStartIndex = useMemo(() => getCurrentPartStartIndex(questions, partQuestions), [partQuestions, questions])
  const currentPartIndex = partStartIndices.indexOf(currentPartStartIndex)
  const previousPartIndex = currentPartIndex > 0 ? partStartIndices[currentPartIndex - 1] : undefined
  const nextPartIndex = currentPartIndex < partStartIndices.length - 1 ? partStartIndices[currentPartIndex + 1] : undefined
  const showPartNavigation = subject.code === "TADV01" && partStartIndices.length === 9
  const partNavigationItems = useMemo(() => buildPartNavigationItems(questions, partStartIndices), [partStartIndices, questions])

  const isToeic = subject.code === "TOEIC01"
  const isSinglePartToeic = isToeic && !!toeicScope && /^part[1-7]$/.test(toeicScope)
  const isTwoLevelToeic = isToeic && !!toeicScope && ["full", "listening", "reading"].includes(toeicScope)
  const toeicGroups = useMemo<ToeicGroup[]>(() => (isToeic ? buildToeicGroups(questions, partStartIndices) : []), [isToeic, partStartIndices, questions])
  const toeicTwoLevelData = useMemo(() => (isTwoLevelToeic ? buildToeicTwoLevelData(toeicGroups, currentIndex) : null), [currentIndex, isTwoLevelToeic, toeicGroups])

  const isPractice = setup.mode === "practice" || forcePractice

  // Practice Hard derived state.
  const hardCurrent = hardQueue[hardPos]
  const hardAnswered = hardSelected !== undefined
  const hardTotalWrong = useMemo(() => Object.values(hardWrongCounts).reduce((sum, count) => sum + count, 0), [hardWrongCounts])
  const hardTotalAnswers = hardMastered + hardTotalWrong
  const hardWeakQuestions = useMemo(() => questions.filter((q) => (hardWrongCounts[q.id] ?? 0) > 2), [hardWrongCounts, questions])
  const hardProgress = questions.length ? Math.round((hardMastered / questions.length) * 100) : 0
  const hardCompletedAll = hardMastered === questions.length

  useEffect(() => {
    if (!finished) return
    window.history.replaceState(null, "", status === "authenticated" ? appRoutes.result : appRoutes.resultGuest)
    if (historySaved.current) return
    historySaved.current = true
    void incrementSubjectAttempt(subject.id)
    if (!user) return
    const wrong = isHard ? questions.filter((question) => (hardWrongCounts[question.id] ?? 0) > 0) : wrongQuestions
    const historyId = `${exam.id}-${Date.now()}`
    const correct = isHard ? hardMastered : stats.correct
    lastSavedHistoryId.current = historyId
    const accuracy = questions.length ? Math.round((correct / questions.length) * 100) : 0
    const historyItem = {
      id: historyId,
      examId: exam.id,
      subjectId: subject.id,
      title: getExamTitle(exam, lang),
      mode: setup.mode,
      score: stats.score10,
      correct,
      total: questions.length,
      accuracy,
      durationSeconds: elapsedSeconds,
      completedAt: new Date().toISOString(),
      setup,
      lang,
      chapterId,
      toeicScope,
      retryOfHistoryId: activeRetryNumber ? retryRootHistoryId.current : undefined,
      retryNumber: activeRetryNumber,
      wrongQuestions: wrong.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        correctAnswer: question.correctIndex === undefined
          ? question.acceptedAnswers?.join(" / ") ?? ""
          : `${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}`,
        wasSkipped: !isHard && answers[question.id] === undefined,
      })),
    }
    savePracticeHistory(historyItem, user.id)
    // P2: mirror lên server để /admin xem được + ghi timeline luồng sau active.
    mirrorPracticeAttempt(historyItem, user.id)
    logActivityEvent(user.id, activeRetryNumber ? "retry_wrong" : "submit_attempt", {
      historyId,
      examId: exam.id,
      subjectId: subject.id,
      mode: setup.mode,
      score: stats.score10,
      accuracy,
      durationSeconds: elapsedSeconds,
      total: questions.length,
      retryNumber: activeRetryNumber ?? null,
      sessionId: endAttemptSession(exam.id),
    })
  }, [activeRetryNumber, answers, chapterId, elapsedSeconds, exam, finished, hardMastered, hardProgress, hardWrongCounts, isHard, lang, questions, setup, stats.correct, stats.score10, status, subject.id, toeicScope, user, wrongQuestions])

  const handleAnswer = useCallback((questionId: string, answer: AnswerValue) => {
    const question = questionById.get(questionId)
    if (isPractice && question && typeof answer === "number") {
      playAnswerFeedback(isAnswerCorrect(question, answer))
    }
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: answer }))
  }, [isPractice, questionById])

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index)
    setTransitionKey((value) => value + 1)
  }, [])

  const handleFinish = useCallback(() => setConfirmOpen(true), [])

  const handleRetryWrong = useCallback(() => {
    if (wrongQuestions.length === 0) return
    historySaved.current = false
    retryRootHistoryId.current ??= lastSavedHistoryId.current
    setActiveRetryNumber((current) => (current ?? 0) + 1)
    window.history.replaceState(null, "", status === "authenticated" ? appRoutes.practice : appRoutes.practiceGuest)
    setRetryHistory((prev) => [...prev, { correct: stats.correct, total: questions.length, accuracy: stats.accuracy }])
    const subset = wrongQuestions.length === questions.length ? shuffle([...wrongQuestions]) : wrongQuestions
    setQuestions(subset)
    setAnswers({})
    setCurrentIndex(0)
    setFinished(false)
    setReviewOpen(false)
    setConfirmOpen(false)
    resetTimer()
    setTransitionKey((value) => value + 1)
    setForcePractice(true)
  }, [questions, resetTimer, setQuestions, setRetryHistory, stats, status, wrongQuestions])

  const handleOpenReview = useCallback((questionId?: string) => {
    setReviewQuestionId(questionId)
    setReviewFilteredIds(undefined)
    setReviewOpen(true)
  }, [])

  const handleOpenQuestionList = useCallback((questionIds: string[]) => {
    setReviewFilteredIds(questionIds)
    setReviewQuestionId(undefined)
    setReviewOpen(true)
  }, [])

  const handleHardAnswer = useCallback((_questionId: string, answer: AnswerValue) => {
    if (hardSelected === undefined && hardCurrent) {
      playAnswerFeedback(isAnswerCorrect(hardCurrent, answer))
    }
    setHardSelected((previous) => (previous === undefined ? answer : previous))
  }, [hardCurrent, hardSelected])

  const handleHardNext = useCallback(() => {
    const currentHardQuestion = hardQueue[hardPos]
    if (!currentHardQuestion || hardSelected === undefined) return
    const correct = isAnswerCorrect(currentHardQuestion, hardSelected)
    if (correct) {
      const { queue: nextQueue, pos: nextPos, done } = applyCorrect(hardQueue, hardPos)
      setHardMastered((count) => count + 1)
      setHardFinalAnswers((previous) => ({ ...previous, [currentHardQuestion.id]: hardSelected }))
      setHardQueue(nextQueue)
      setHardSelected(undefined)
      setTransitionKey((value) => value + 1)
      if (done) {
        setFinished(true)
        return
      }
      setHardPos(nextPos)
    } else {
      setHardWrongCounts((previous) => ({ ...previous, [currentHardQuestion.id]: (previous[currentHardQuestion.id] ?? 0) + 1 }))
      const { queue: nextQueue, pos: nextPos } = applyWrong(hardQueue, hardPos)
      setHardQueue(nextQueue)
      setHardPos(nextPos)
      setHardSelected(undefined)
      setTransitionKey((value) => value + 1)
    }
  }, [hardPos, hardQueue, hardSelected])

  const handleHardRestart = useCallback(() => {
    historySaved.current = false
    setHardQueue(buildHardQueue(questions, setup.questionOrder === "random"))
    setHardPos(0)
    setHardMastered(0)
    setHardWrongCounts({})
    setHardSelected(undefined)
    setHardFinalAnswers({})
    setFinished(false)
    setReviewOpen(false)
    setConfirmOpen(false)
    resetTimer()
    setTransitionKey((value) => value + 1)
  }, [questions, resetTimer, setup.questionOrder])

  const handleHardContinue = useCallback(() => {
    setFinished(false)
    setReviewOpen(false)
    resetTimer()
  }, [resetTimer])

  if (loading) return (<CenterCard><p className="lp-modal-desc text-[15px]">{t.loading}</p></CenterCard>)
  if (error || questions.length === 0) return (
    <CenterCard>
      <p className="lp-modal-desc text-[15px]">{t.loadError}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}>{t.backDocs}</button>
        <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={reload}>{t.retry}</button>
      </div>
    </CenterCard>
  )
  if (finished) {
    if (isHard) {
      return (
        <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-6 py-8 lg:px-8">
          <div className="quiz-result-card rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{t.modeHard}</p>
                <h1 className="lp-section-heading mt-2 text-[28px]">{hardCompletedAll ? t.resultTitleHard : t.resultTitleTimeOut}</h1>
                <p className="lp-modal-desc mt-2">{getExamTitle(exam, lang)}</p>
                {!hardCompletedAll ? <p className="lp-modal-desc mt-2 font-semibold text-[#1CB0F6]">{questions.length - hardMastered} {t.hardRemaining}</p> : null}
              </div>
              <div className="mx-auto flex min-h-[112px] w-full max-w-[220px] flex-col items-center justify-center rounded-[16px] bg-[#F6F7FB] px-5 py-4 text-center dark:bg-white/5 sm:mx-0">
                <p className="lp-label text-[12px]">{t.mastered}</p>
                <p className="mt-1 text-[36px] font-extrabold tracking-[-0.04em] text-[#100F3E] dark:text-white">
                  {hardMastered}
                  <span className="text-[18px] font-bold text-[#777777]">/{questions.length}</span>
                </p>
              </div>
            </div>
            <div className="relative mt-6">
              <div className="grid grid-cols-2 grid-rows-2 gap-3">
                <StatCard label={t.wrongCount} value={`${hardTotalWrong}`} />
                <StatCard label={t.totalAnswers} value={`${hardTotalAnswers}`} />
                <StatCard label={t.duration} value={formatTime(elapsedSeconds)} />
                <StatCard label={t.progress} value={`${hardProgress}%`} />
              </div>
            </div>
            {hardWeakQuestions.length > 0 ? (
              <div className="mt-6 rounded-[12px] border-2 border-[#F2C94C] bg-[#FDE9C8] p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="lp-label mb-2 font-extrabold text-[#B45309] dark:text-amber-300">{t.hardWeakTitle}</p>
                <div className="space-y-3">
                  {hardWeakQuestions.map((q) => (
                    <div key={q.id} className="rounded-[10px] border border-[#EECB8A] bg-white px-3 py-2.5 dark:border-amber-500/20 dark:bg-slate-900">
                      <p className="text-[13px] font-bold leading-5 text-[#100F3E] dark:text-white">{q.prompt}</p>
                      <p className="mt-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="font-extrabold">{t.rightAnswer}:</span>{" "}
                        {q.correctIndex === undefined ? q.acceptedAnswers?.join(" / ") : `${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`}
                      </p>
                      <p className="mt-0.5 text-[12px] font-semibold text-[#B45309] dark:text-amber-300">{t.wrongCount}: {hardWrongCounts[q.id]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}>{t.backDocs}</button>
              {hardCompletedAll ? (
                <>
                  <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => setReviewOpen(true)}>{t.review}</button>
                  <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={handleHardRestart}>
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    {t.retry}
                  </button>
                </>
              ) : (
                <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={handleHardContinue}>
                  <Play className="h-4 w-4" strokeWidth={2} />
                  {t.continue}
                </button>
              )}
            </div>
          </div>
          {reviewOpen ? <ReviewPanel t={t} questions={questions} answers={hardFinalAnswers} hideExplanation={hideExplanation} onClose={() => setReviewOpen(false)} /> : null}
        </div>
      )
    }
    if (isTwoLevelToeic) {
      const isExam = setup.mode === "exam" || forcePractice
      const modeLabel = setup.mode === "practice" || forcePractice ? t.modePractice : t.modeExam
      const resultTitle = setup.mode === "practice" || forcePractice ? t.resultTitlePractice : t.resultTitleExam
      const wrongCount = wrongQuestions.length
      return (
        <>
          <ToeicResultPanel
            questions={questions}
            answers={answers}
            elapsedSeconds={elapsedSeconds}
            toeicScope={toeicScope}
            questionNumberMap={questionNumberMap}
            t={toeicResultCopy[lang]}
            lang={lang}
            score10={stats.score10}
            isExam={isExam}
            modeLabel={modeLabel}
            resultTitle={resultTitle}
            examTitle={getExamTitle(exam, lang)}
            exitLabel={t.backDocs}
            reviewLabel={t.review}
            retryWrongLabel={wrongCount > 0 ? `${t.retryWrong} (${wrongCount})` : t.retryWrong}
            retryWrongDisabled={wrongCount === 0}
            onExit={onExit}
            onRetryWrong={handleRetryWrong}
            onReview={handleOpenReview}
            onOpenQuestionList={handleOpenQuestionList}
          />
          {reviewOpen ? (
            <ReviewPanel
              t={t}
              questions={questions}
              answers={answers}
              hideExplanation={hideExplanation}
              initialQuestionId={reviewQuestionId}
              filteredQuestionIds={reviewFilteredIds}
              numberMap={questionNumberMap}
              onClose={() => setReviewOpen(false)}
            />
          ) : null}
        </>
      )
    }
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-6 py-8 lg:px-8">
        <div className="quiz-result-card rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{setup.mode === "practice" || forcePractice ? t.modePractice : t.modeExam}</p>
              <h1 className="lp-section-heading mt-2 text-[28px]">{setup.mode === "practice" || forcePractice ? t.resultTitlePractice : t.resultTitleExam}</h1>
              <p className="lp-modal-desc mt-2">{getExamTitle(exam, lang)}</p>
            </div>
            <div className="mx-auto flex min-h-[112px] w-full max-w-[220px] flex-col items-center justify-center rounded-[16px] bg-[#F6F7FB] px-5 py-4 text-center dark:bg-white/5 sm:mx-0">
              <p className="lp-label text-[12px]">{t.score}</p>
              <p className="mt-1 text-[36px] font-extrabold tracking-[-0.04em] text-[#100F3E] dark:text-white">
                {stats.score10.toFixed(1)}
                <span className="text-[18px] font-bold text-[#777777]">/10</span>
              </p>
            </div>
          </div>
          <div className="relative mt-6">
            <div className="grid grid-cols-2 grid-rows-3 gap-3">
              <StatCard label={t.correct} value={`${stats.correct}`} />
              <StatCard label={t.wrong} value={`${stats.wrong}`} />
              <StatCard label={t.skipped} value={`${stats.skipped}`} />
              <StatCard label={t.accuracy} value={`${stats.accuracy}%`} />
              <StatCard label={t.duration} value={formatTime(elapsedSeconds)} />
              <StatCard label={t.progress} value={`${progress}%`} />
            </div>
            {(setup.mode === "exam" || forcePractice) && <ResultStamp score={stats.score10} />}
          </div>
          {subject.code !== "TADV01" && retryHistory.length > 0 ? (
            <div className="mt-6 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="lp-label mb-2 text-[#129BDC]">{t.progress}</p>
              <div className="space-y-1 text-[13px] font-semibold leading-5 text-[#100F3E] dark:text-sky-100">
                {retryHistory.map((h, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{t.attempt} {i + 1}</span>
                    <span>{h.correct}/{h.total} ({h.accuracy}%)</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#B3E5FC] pt-2 font-extrabold text-[#1CB0F6] dark:border-sky-500/20">
                  <span>{t.current}</span>
                  <span>{stats.correct}/{questions.length} ({stats.accuracy}%)</span>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}>{t.backDocs}</button>
            {subject.code !== "TADV01" ? (
              wrongQuestions.length > 0 ? (
                <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={handleRetryWrong}>
                  {t.retryWrong} ({wrongQuestions.length})
                </button>
              ) : (
                <button type="button" className="lp-btn lp-btn--primary lp-btn--sm opacity-50" disabled title={t.allCorrect}>
                  {t.retryWrong}
                </button>
              )
            ) : null}
            {setup.mode === "practice" || forcePractice ? (<button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => setReviewOpen(true)}>{t.review}</button>) : null}
          </div>
        </div>
        {reviewOpen ? <ReviewPanel t={t} questions={questions} answers={answers} hideExplanation={hideExplanation} onClose={() => setReviewOpen(false)} /> : null}
      </div>
    )
  }
  if (isHard) {
    if (!hardCurrent) return (<CenterCard><p className="lp-modal-desc text-[15px]">{t.loading}</p></CenterCard>)
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onExit} className="lp-btn lp-btn--secondary lp-btn--sm"><ArrowLeft className="h-4 w-4" strokeWidth={2} />{t.exit}</button>
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[13px] font-extrabold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:text-white">
            <Clock3 className="h-4 w-4 text-[#1CB0F6]" strokeWidth={2} />
            {setup.timed ? `${t.timeLeft}: ${formatTime(secondsLeft)}` : t.unlimited}
          </div>
        </div>

        <div className="mb-4 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="lp-label">{t.mastered} {hardMastered} {t.of} {questions.length}</span>
            <span className="lp-label text-[#1CB0F6]">{t.progress}: {hardProgress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-white/10">
            <div className="h-full rounded-full bg-[#1CB0F6] transition-all duration-500 ease-out" style={{ width: `${hardProgress}%` }} />
          </div>
        </div>

        <div key={transitionKey} className="quiz-question-panel rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{subject.code} · {t.modeHard}</p>
            <p className="lp-card-meta">{getExamTitle(exam, lang)}</p>
          </div>
          <QuestionMedia question={hardCurrent} t={t} onZoomImage={(url) => setLightboxImage(url)} />
          <QuizQuestionBlock
            question={hardCurrent}
            questionNumber={hardPos + 1}
            selected={hardSelected}
            isPractice
            locked={hardAnswered}
            hideExplanation={hideExplanation}
            t={t}
            onAnswer={handleHardAnswer}
          />
          <div className="mt-8 flex flex-row gap-3 sm:justify-end">
            <button
              type="button"
              className="lp-btn lp-btn--primary lp-btn--sm w-full min-w-0 flex-1 disabled:opacity-50 sm:w-auto sm:flex-none"
              disabled={!hardAnswered}
              onClick={handleHardNext}
            >
              {hardQueue.length === 1 ? t.complete : t.next}
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {lightboxImage ? (
        <Dialog open onClose={() => setLightboxImage(null)} title={t.imagePreviewTitle} closeLabel={t.confirmNo} className="z-[100] bg-black/80 backdrop-blur-sm" panelClassName="max-h-[90dvh] max-w-[95vw]">
          <img src={lightboxImage} alt={t.imagePreviewTitle} className="max-h-[90dvh] max-w-[95vw] rounded-lg object-contain shadow-2xl" />
          </Dialog>
        ) : null}
      </div>
    )
  }
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-1 flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="lp-btn lp-btn--secondary lp-btn--sm"><ArrowLeft className="h-4 w-4" strokeWidth={2} />{t.exit}</button>
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[13px] font-extrabold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:text-white">
          <Clock3 className="h-4 w-4 text-[#1CB0F6]" strokeWidth={2} />
          {setup.timed ? `${t.timeLeft}: ${formatTime(secondsLeft)}` : t.unlimited}
        </div>
      </div>

      <div className="mb-4 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="lp-label">{t.question} {currentIndex + 1} {t.of} {questions.length}</span>
          <span className="lp-label text-[#1CB0F6]">{t.progress}: {progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-white/10">
          <div className="h-full rounded-full bg-[#1CB0F6] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,280px)]">
        <div key={transitionKey} className="quiz-question-panel rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{subject.code} · {setup.mode === "practice" || forcePractice ? t.modePractice : t.modeExam}</p>
            <p className="lp-card-meta">{getExamTitle(exam, lang)}</p>
          </div>
          <QuestionMedia question={current} t={t} onZoomImage={(url) => setLightboxImage(url)} />
          <div className="space-y-5">
            {partQuestions.map((question) => (
              <QuizQuestionBlock
                key={question.id}
                question={question}
                questionNumber={questionNumberMap.get(question.id) ?? 0}
                selected={answers[question.id]}
                isPractice={isPractice}
                compact
                hideExplanation={hideExplanation}
                t={t}
                onAnswer={handleAnswer}
              />
            ))}
          </div>
          <div className="mt-8 flex flex-row gap-3 sm:justify-between">
            <button
              type="button"
              className="lp-btn lp-btn--secondary lp-btn--sm w-1/2 min-w-0 flex-1 disabled:opacity-50 sm:w-auto sm:flex-none"
              disabled={previousPartIndex === undefined}
              onClick={() => previousPartIndex !== undefined && goToQuestion(previousPartIndex)}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              {t.previous}
            </button>
            {nextPartIndex === undefined ? (
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm w-1/2 min-w-0 flex-1 sm:w-auto sm:flex-none"
                onClick={() => setConfirmOpen(true)}
              >
                {t.finish}
              </button>
            ) : (
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm w-1/2 min-w-0 flex-1 sm:w-auto sm:flex-none"
                onClick={() => nextPartIndex !== undefined && goToQuestion(nextPartIndex)}
              >
                {t.next}
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <QuizSidebar
          showPartNavigation={showPartNavigation}
          partNavigationItems={partNavigationItems}
          currentPartStartIndex={currentPartStartIndex}
          isToeic={isToeic}
          isSinglePartToeic={isSinglePartToeic}
          isTwoLevelToeic={isTwoLevelToeic}
          toeicGroups={toeicGroups}
          toeicTwoLevelData={toeicTwoLevelData}
          questions={questions}
          answers={answers}
          partQuestionIds={partQuestionIds}
          t={t}
          onJump={goToQuestion}
          onFinish={handleFinish}
        />
      </div>

      {confirmOpen ? (
        <Dialog open onClose={() => setConfirmOpen(false)} title={t.confirmTitle} closeLabel={t.confirmNo} className="z-[95]" panelClassName="max-h-[calc(100dvh_-_2rem)] w-full max-w-[420px] rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
            <h3 className="lp-modal-title text-[20px]">{t.confirmTitle}</h3>
            <p className="lp-modal-desc mt-2">{t.confirmDesc}</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => setConfirmOpen(false)}>{t.confirmNo}</button>
              <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => { setConfirmOpen(false); setFinished(true) }}>{t.confirmYes}</button>
            </div>
        </Dialog>
      ) : null}

      {lightboxImage ? (
        <Dialog open onClose={() => setLightboxImage(null)} title={t.imagePreviewTitle} closeLabel={t.confirmNo} className="z-[100] bg-black/80 backdrop-blur-sm" panelClassName="max-h-[90dvh] max-w-[95vw]">
          <img src={lightboxImage} alt={t.imagePreviewTitle} className="max-h-[90dvh] max-w-[95vw] rounded-lg object-contain shadow-2xl" />
        </Dialog>
      ) : null}
    </div>
  )
}

function QuestionMedia({ question, t, onZoomImage }: {
  question: Question
  t: (typeof copy)["en" | "vi"]
  onZoomImage: (url: string) => void
}) {
  const displayPartTitle = question.partTitle ? stripPart6GroupSuffix(question.partTitle) : undefined
  return (
    <>
      {question.partTitle || question.instruction ? (
        <div className="mb-5 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3 text-[13px] leading-6 text-[#100F3E] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
          {displayPartTitle ? <p className="font-extrabold text-[#129BDC]">{displayPartTitle}</p> : null}
          {question.instruction ? <p className={question.partTitle ? "mt-1" : ""}>{question.instruction}</p> : null}
        </div>
      ) : null}
      {question.imageUrl ? (
        <div className="mb-5 overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
          <button
            type="button"
            className="block w-full cursor-zoom-in"
            onClick={() => onZoomImage(question.imageUrl ?? "")}
            aria-label={t.imageZoomLabel}
          >
            <img
              src={question.imageUrl}
              alt={question.partTitle ?? "Reading part image"}
              className="h-auto w-full object-contain"
              loading="lazy"
            />
          </button>
          <p className="px-3 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t.imageZoomHint}</p>
        </div>
      ) : null}
      {question.audioUrl ? (
        <div className="mb-5 rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] p-3 dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-extrabold text-[#129BDC]"><span>{t.listeningAudio}</span>{question.audioTimestamp ? <span>{question.audioTimestamp}</span> : null}</div>
          <audio controls preload="metadata" className="w-full" src={question.audioUrl}>Your browser does not support audio playback.</audio>
        </div>
      ) : null}
      {!question.imageUrl && question.passage && !question.passage.trim().startsWith("Transcript:") ? <p className="mb-5 whitespace-pre-line rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 text-[13px] leading-6 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{question.passage}</p> : null}
      {!question.imageUrl && question.referenceNotices ? <div className="mb-5 grid gap-2 sm:grid-cols-2">{Object.entries(question.referenceNotices).map(([key, notice]) => <div key={key} className="rounded-[10px] border border-[#E5E5E5] bg-[#F6F7FB] px-3 py-2 text-[12px] leading-5 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><span className="font-extrabold text-[#129BDC]">{key}. </span>{notice}</div>)}</div> : null}
    </>
  )
}
