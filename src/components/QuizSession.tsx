import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getExamTitle,
  type ExamPaper,
  type Subject,
} from "@/data/subjects"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { quizCopy as copy } from "@/shared/i18n"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"
import { shuffle, formatTime } from "@/features/quiz/lib/quizHelpers"
import type { ToeicScope } from "@/data/toeic"
import { getAnsweredCount, getIncorrectQuestions, getQuizStats } from "@/features/quiz/lib/quizSelectors"
import { useQuizQuestions } from "@/features/quiz/hooks/useQuizQuestions"
import { useQuizTimer } from "@/features/quiz/hooks/useQuizTimer"
import { useRetryHistory } from "@/features/quiz/hooks/useRetryHistory"
import { QuizQuestionBlock } from "@/features/quiz/ui/QuizQuestionBlock"
import { ReviewPanel } from "@/features/quiz/ui/ReviewPanel"
import { StatCard } from "@/features/quiz/ui/StatCard"
import { CenterCard } from "@/features/quiz/ui/CenterCard"
import { ResultStamp } from "@/features/quiz/ui/ResultStamp"
import { Dialog } from "@/components/ui/dialog"

type Lang = "en" | "vi"

type QuizSessionProps = {
  lang: Lang
  subject: Subject
  exam: ExamPaper
  setup: QuizSetupValues
  chapterId?: string
  toeicScope?: ToeicScope
  onExit: () => void
}

export function QuizSession({ lang, subject, exam, setup, chapterId, toeicScope, onExit }: QuizSessionProps) {
  const t = copy[lang]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [finished, setFinished] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [transitionKey, setTransitionKey] = useState(0)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [forcePractice, setForcePractice] = useState(false)
  const retryStorageKey = `quiz-retry-${exam.id}-${chapterId ?? "all"}-${toeicScope ?? "noscope"}`
  const { questions, setQuestions, loading, error, reload } = useQuizQuestions({ subject, exam, setup, chapterId, toeicScope })
  const { history: retryHistory, setHistory: setRetryHistory, clear: clearRetryHistory } = useRetryHistory(retryStorageKey)
  const handleTimeout = useCallback(() => setFinished(true), [])
  const { secondsLeft, elapsedSeconds, reset: resetTimer } = useQuizTimer({
    isRunning: !finished && !loading && !error && questions.length > 0,
    timed: setup.timed,
    durationMinutes: setup.durationMinutes,
    onTimeout: handleTimeout,
  })

  useEffect(() => {
    if (!loading) return
    setCurrentIndex(0)
    setAnswers({})
    setFinished(false)
    setReviewOpen(false)
    setConfirmOpen(false)
    clearRetryHistory()
    setForcePractice(false)
    resetTimer()
  }, [clearRetryHistory, loading, resetTimer])

  const current = questions[currentIndex]
  const answeredCount = useMemo(() => getAnsweredCount(questions, answers), [answers, questions])
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0
  const stats = useMemo(() => getQuizStats(questions, answers), [answers, questions])
  const wrongQuestions = useMemo(() => getIncorrectQuestions(questions, answers), [questions, answers])

  const handleRetryWrong = () => {
    if (wrongQuestions.length === 0) return
    setRetryHistory((prev) => [...prev, { correct: stats.correct, total: questions.length, accuracy: stats.accuracy }])
    const subset = wrongQuestions.length === questions.length ? shuffle([...wrongQuestions]) : wrongQuestions
    setQuestions(subset)
    setAnswers({})
    setCurrentIndex(0)
    setFinished(false)
    setReviewOpen(false)
    setConfirmOpen(false)
    resetTimer()
    setTransitionKey((v) => v + 1)
    setForcePractice(true)
  }

  const goToQuestion = (index: number) => { setCurrentIndex(index); setTransitionKey((v) => v + 1) }

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
              <p className="lp-label mb-2 text-[#129BDC]">{lang === "vi" ? "Tiến bộ" : "Progress"}</p>
              <div className="space-y-1 text-[13px] font-semibold leading-5 text-[#100F3E] dark:text-sky-100">
                {retryHistory.map((h, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{lang === "vi" ? `Lần ${i + 1}` : `Attempt ${i + 1}`}</span>
                    <span>{h.correct}/{h.total} ({h.accuracy}%)</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#B3E5FC] pt-2 font-extrabold text-[#1CB0F6] dark:border-sky-500/20">
                  <span>{lang === "vi" ? "Hiện tại" : "Current"}</span>
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
                <button type="button" className="lp-btn lp-btn--primary lp-btn--sm opacity-50" disabled title={lang === "vi" ? "Bạn đã đúng hết!" : "All correct!"}>
                  {t.retryWrong}
                </button>
              )
            ) : null}
            {setup.mode === "practice" || forcePractice ? (<button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => setReviewOpen(true)}>{t.review}</button>) : null}
          </div>
        </div>
        {reviewOpen ? <ReviewPanel t={t} questions={questions} answers={answers} onClose={() => setReviewOpen(false)} /> : null}
      </div>
    )
  }

  const isPractice = setup.mode === "practice" || forcePractice
  const displayPartTitle = current.partTitle?.replace(/\s+-\s+part6_group_\d+_\d+$/i, "")
  const getPartKey = (question: Question) => question.partTitle ?? question.id
  const currentPartKey = getPartKey(current)
  const partQuestions = questions.filter((question) => getPartKey(question) === currentPartKey)
  const partQuestionIds = new Set(partQuestions.map((question) => question.id))
  const partStartIndices = questions.reduce<number[]>((indices, question, index) => {
    if (index === 0 || getPartKey(question) !== getPartKey(questions[index - 1])) indices.push(index)
    return indices
  }, [])
  const currentPartStartIndex = questions.findIndex((question) => question.id === partQuestions[0].id)
  const currentPartIndex = partStartIndices.indexOf(currentPartStartIndex)
  const previousPartIndex = currentPartIndex > 0 ? partStartIndices[currentPartIndex - 1] : undefined
  const nextPartIndex = currentPartIndex < partStartIndices.length - 1 ? partStartIndices[currentPartIndex + 1] : undefined
  const showPartNavigation = subject.code === "TADV01" && partStartIndices.length === 9
  const partNavigationItems = partStartIndices.map((startIndex, index) => {
    const firstQuestion = questions[startIndex]
    const partNumber = firstQuestion.partTitle?.match(/PART\s+(\d+)/i)?.[1] ?? String(index + 1)
    const label = `Part ${partNumber} - ${firstQuestion.section ?? "Quiz"}`
    return { startIndex, label }
  })

  const isToeic = subject.code === "TOEIC01"
  const isSinglePartToeic = isToeic && !!toeicScope && /^part[1-7]$/.test(toeicScope)
  const isTwoLevelToeic = isToeic && !!toeicScope && ["full", "listening", "reading"].includes(toeicScope)
  const toeicGroups: Array<{ start: number; end: number; count: number; partLabel: string; groupLabel: string; title: string }> = (() => {
    if (!isToeic) return []
    const partCounters = new Map<string, number>()
    return partStartIndices.map((start, idx) => {
      const end = idx < partStartIndices.length - 1 ? partStartIndices[idx + 1] : questions.length
      const count = end - start
      const title = questions[start]?.partTitle ?? `Group ${idx + 1}`
      const partNum = title.match(/Part\s+(\d+)/i)?.[1]
      const groupNum = title.match(/Group\s+(\d+)/i)?.[1]
      const qNum = title.match(/Q\s*(\d+)/i)?.[1]
      const partKey = partNum ? `Part ${partNum}` : title.split(" - ")[1] ?? `group-${idx}`
      const nextInPart = (partCounters.get(partKey) ?? 0) + 1
      partCounters.set(partKey, nextInPart)
      let groupLabel = ""
      if (groupNum) groupLabel = `Nhóm ${groupNum}`
      else if (qNum) groupLabel = `Câu ${qNum}`
      else groupLabel = `Nhóm ${nextInPart}`
      const partLabel = partNum ? `Part ${partNum}` : (title.split(" - ")[1] ?? `Nhóm ${idx + 1}`)
      return { start, end, count, title, partLabel, groupLabel }
    })
  })()

  const toeicTwoLevelData = (() => {
    if (!isTwoLevelToeic) return null
    const partMap = new Map<string, { partNum: string; partLabel: string; totalQuestions: number; firstStart: number }>()
    for (const g of toeicGroups) {
      const pn = g.partLabel.match(/Part\s+(\d+)/)?.[1] ?? g.partLabel
      const existing = partMap.get(pn)
      if (existing) existing.totalQuestions += g.count
      else partMap.set(pn, { partNum: pn, partLabel: g.partLabel, totalQuestions: g.count, firstStart: g.start })
    }
    const partList = Array.from(partMap.values()).sort((a, b) => Number(a.partNum) - Number(b.partNum))
    const currentGroup = toeicGroups.find((g) => currentIndex >= g.start && currentIndex < g.end)
    const selectedPartNum = currentGroup ? (currentGroup.partLabel.match(/Part\s+(\d+)/)?.[1] ?? partList[0]?.partNum ?? null) : (partList[0]?.partNum ?? null)
    const filteredGroups = selectedPartNum ? toeicGroups.filter((g) => g.partLabel === `Part ${selectedPartNum}`) : []
    return { partList, selectedPartNum, filteredGroups }
  })()

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
          {current.partTitle || current.instruction ? (
            <div className="mb-5 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3 text-[13px] leading-6 text-[#100F3E] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
              {displayPartTitle ? <p className="font-extrabold text-[#129BDC]">{displayPartTitle}</p> : null}
              {current.instruction ? <p className={current.partTitle ? "mt-1" : ""}>{current.instruction}</p> : null}
            </div>
          ) : null}
          {current.imageUrl ? (
            <div className="mb-5 overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <button
                type="button"
                className="block w-full cursor-zoom-in"
                onClick={() => setLightboxImage(current.imageUrl ?? null)}
                aria-label={t.imageZoomLabel}
              >
                <img
                  src={current.imageUrl}
                  alt={current.partTitle ?? "Reading part image"}
                  className="h-auto w-full object-contain"
                  loading="lazy"
                />
              </button>
              <p className="px-3 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t.imageZoomHint}</p>
            </div>
          ) : null}
          {current.audioUrl ? (
            <div className="mb-5 rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-extrabold text-[#129BDC]"><span>{t.listeningAudio}</span>{current.audioTimestamp ? <span>{current.audioTimestamp}</span> : null}</div>
              <audio controls preload="metadata" className="w-full" src={current.audioUrl}>Your browser does not support audio playback.</audio>
            </div>
          ) : null}
          {!current.imageUrl && current.passage && !current.passage.trim().startsWith("Transcript:") ? <p className="mb-5 whitespace-pre-line rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 text-[13px] leading-6 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{current.passage}</p> : null}
          {!current.imageUrl && current.referenceNotices ? <div className="mb-5 grid gap-2 sm:grid-cols-2">{Object.entries(current.referenceNotices).map(([key, notice]) => <div key={key} className="rounded-[10px] border border-[#E5E5E5] bg-[#F6F7FB] px-3 py-2 text-[12px] leading-5 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><span className="font-extrabold text-[#129BDC]">{key}. </span>{notice}</div>)}</div> : null}
          <div className={cn("space-y-8", subject.code === "TADV01" && "space-y-5")}>
            {partQuestions.map((question) => <QuizQuestionBlock key={question.id} question={question} questionNumber={questions.findIndex((item) => item.id === question.id) + 1} answers={answers} isPractice={isPractice} compact={subject.code === "TADV01"} t={t} onAnswer={(answer) => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: answer }))} />)}
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

        <aside className="min-w-0 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-3 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-4">
          <p className="lp-label mb-3">{showPartNavigation ? "Parts" : t.jump}</p>
          <div className="max-h-[420px] overflow-x-hidden overflow-y-auto pr-1">
            {showPartNavigation ? (
              <div className="grid grid-cols-3 gap-2 pb-1">
                {partNavigationItems.map((part) => {
                  const active = part.startIndex === currentPartStartIndex
                  const [partText, sectionText] = part.label.split(" - ")
                  return (
                    <button
                      key={part.startIndex}
                      type="button"
                      onClick={() => goToQuestion(part.startIndex)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                        active
                          ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                          : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      )}
                    >
                      <span className="text-[11px] font-extrabold leading-none">{partText}</span>
                      <span className="mt-1 text-[10px] font-bold leading-none opacity-80">{sectionText}</span>
                    </button>
                  )
                })}
              </div>
            ) : isToeic ? (
              isTwoLevelToeic && toeicTwoLevelData ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-4 gap-2 pb-1 lg:grid-cols-3">
                    {toeicTwoLevelData.partList.map((part) => {
                      const active = part.partNum === toeicTwoLevelData.selectedPartNum
                      const partGroups = toeicGroups.filter((g) => g.partLabel === part.partLabel)
                      const answeredInPart = partGroups.reduce((acc, g) => acc + questions.slice(g.start, g.end).filter((q) => answers[q.id] !== undefined).length, 0)
                      const allAnswered = answeredInPart === part.totalQuestions
                      const someAnswered = answeredInPart > 0 && !allAnswered
                      return (
                        <button
                          key={part.partNum}
                          type="button"
                          title={part.partLabel}
                          onClick={() => goToQuestion(part.firstStart)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[11px] font-extrabold leading-none">{part.partLabel}</span>
                          <span
                            className={cn(
                              "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                              active
                                ? "bg-white/20 text-white"
                                : allAnswered
                                  ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                  : someAnswered
                                    ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                    : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                            )}
                          >
                            {part.totalQuestions} câu
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="h-px bg-[#E5E5E5] dark:bg-white/10" />
                  <div className="grid grid-cols-4 gap-2 pb-1 lg:grid-cols-3">
                    {toeicTwoLevelData.filteredGroups.map((g) => {
                      const active = g.start === currentPartStartIndex
                      const answeredInGroup = questions.slice(g.start, g.end).filter((q) => answers[q.id] !== undefined).length
                      const allAnswered = answeredInGroup === g.count
                      const someAnswered = answeredInGroup > 0 && !allAnswered
                      if (g.count === 1) {
                        return (
                          <button
                            key={g.start}
                            type="button"
                            title={g.title}
                            onClick={() => goToQuestion(g.start)}
                            className={cn(
                              "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                              active
                                ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                                : allAnswered
                                  ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            )}
                          >
                            <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                          </button>
                        )
                      }
                      return (
                        <button
                          key={g.start}
                          type="button"
                          title={g.title}
                          onClick={() => goToQuestion(g.start)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                          <span
                            className={cn(
                              "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                              active
                                ? "bg-white/20 text-white"
                                : allAnswered
                                  ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                  : someAnswered
                                    ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                    : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                            )}
                          >
                            {g.count} câu
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pb-1 lg:grid-cols-3">
                  {toeicGroups.map((g) => {
                    const active = g.start === currentPartStartIndex
                    const answeredInGroup = questions.slice(g.start, g.end).filter((q) => answers[q.id] !== undefined).length
                    const allAnswered = answeredInGroup === g.count
                    const someAnswered = answeredInGroup > 0 && !allAnswered
                    // Nhóm 1 câu (Part5, Part1, Part2): chỉ 1 dòng Câu X cỡ lớn, bỏ Part label + badge
                    if (g.count === 1) {
                      return (
                        <button
                          key={g.start}
                          type="button"
                          title={g.title}
                          onClick={() => goToQuestion(g.start)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                        </button>
                      )
                    }
                    // Theo Part lẻ (part1..part7): không cần hiển thị Part X, tăng size Nhóm lên 13px
                    if (isSinglePartToeic) {
                      return (
                        <button
                          key={g.start}
                          type="button"
                          title={g.title}
                          onClick={() => goToQuestion(g.start)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                          <span
                            className={cn(
                              "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                              active
                                ? "bg-white/20 text-white"
                                : allAnswered
                                  ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                  : someAnswered
                                    ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                    : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                            )}
                          >
                            {g.count} câu
                          </span>
                        </button>
                      )
                    }
                    return (
                      <button
                        key={g.start}
                        type="button"
                        title={g.title}
                        onClick={() => goToQuestion(g.start)}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                          active
                            ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                            : allAnswered
                              ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                              : someAnswered
                                ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        )}
                      >
                        <span className="text-[11px] font-extrabold leading-none">{g.partLabel}</span>
                        <span className="mt-1 text-[10px] font-bold leading-none opacity-80">{g.groupLabel}</span>
                        <span
                          className={cn(
                            "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                            active
                              ? "bg-white/20 text-white"
                              : allAnswered
                                ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                  : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                          )}
                        >
                          {g.count} câu
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              <div
                className="grid gap-[5px] pb-1"
                style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
              >
                {questions.map((question, index) => {
                  const answered = answers[question.id] !== undefined
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => goToQuestion(index)}
                      className={cn(
                        "box-border flex h-[32px] w-full min-w-0 items-center justify-center rounded-[9px] border-2 text-[11px] font-extrabold transition-transform active:translate-y-[1px]",
                        partQuestionIds.has(question.id)
                          ? "border-[#1CB0F6] bg-[#1CB0F6] text-white"
                          : answered
                            ? "border-[#B3E5FC] bg-[#E8F7FE] text-[#129BDC]"
                            : "border-[#E5E5E5] bg-[#F6F7FB] text-[#777777]"
                      )}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-4"
            onClick={() => setConfirmOpen(true)}
          >
            {t.finish}
          </button>
        </aside>
      </div>

      {confirmOpen ? (
        <Dialog open onClose={() => setConfirmOpen(false)} title={t.confirmTitle} closeLabel={t.confirmNo} className="z-[95]" panelClassName="w-full max-w-[420px] rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
            <h3 className="lp-modal-title text-[20px]">{t.confirmTitle}</h3>
            <p className="lp-modal-desc mt-2">{t.confirmDesc}</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => setConfirmOpen(false)}>{t.confirmNo}</button>
              <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => { setConfirmOpen(false); setFinished(true) }}>{t.confirmYes}</button>
            </div>
        </Dialog>
      ) : null}

      {lightboxImage ? (
        <Dialog open onClose={() => setLightboxImage(null)} title={t.imagePreviewTitle} closeLabel={t.confirmNo} className="z-[100] bg-black/80 backdrop-blur-sm" panelClassName="max-h-[90vh] max-w-[95vw]">
          <img src={lightboxImage} alt={t.imagePreviewTitle} className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl" />
        </Dialog>
      ) : null}
    </div>
  )
}



