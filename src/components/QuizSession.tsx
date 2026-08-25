import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getExamTitle,
  type ExamPaper,
  type Subject,
} from "@/data/subjects"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { filterQuestionsBySubjectChapter, hasChapterSupport } from "@/data/subjectChapters"
import { quizCopy as copy } from "@/shared/i18n"
import type { Question, AnswerValue, BankFile } from "@/features/quiz/model/quiz.types"
import { mapBankQuestions, buildFallbackQuestions, isAnswerCorrect, shuffle, formatTime } from "@/features/quiz/lib/quizHelpers"
import { QuizQuestionBlock } from "@/features/quiz/ui/QuizQuestionBlock"
import { ReviewPanel } from "@/features/quiz/ui/ReviewPanel"
import { StatCard } from "@/features/quiz/ui/StatCard"
import { CenterCard } from "@/features/quiz/ui/CenterCard"
import { ResultStamp } from "@/features/quiz/ui/ResultStamp"

type Lang = "en" | "vi"

type QuizSessionProps = {
  lang: Lang
  subject: Subject
  exam: ExamPaper
  setup: QuizSetupValues
  chapterId?: string
  onExit: () => void
}

export function QuizSession({ lang, subject, exam, setup, chapterId, onExit }: QuizSessionProps) {
  const t = copy[lang]
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [secondsLeft, setSecondsLeft] = useState(setup.timed ? setup.durationMinutes * 60 : 0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finished, setFinished] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [transitionKey, setTransitionKey] = useState(0)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [retryHistory, setRetryHistory] = useState<{ correct: number; total: number; accuracy: number }[]>([])
  const [forcePractice, setForcePractice] = useState(false)
  const retryStorageKey = `quiz-retry-${exam.id}-${chapterId ?? "all"}`

  // Load retry history from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(retryStorageKey)
      if (raw) setRetryHistory(JSON.parse(raw))
    } catch {}
  }, [retryStorageKey])

  // Persist retry history
  useEffect(() => {
    try {
      if (retryHistory.length > 0) sessionStorage.setItem(retryStorageKey, JSON.stringify(retryHistory))
      else sessionStorage.removeItem(retryStorageKey)
    } catch {}
  }, [retryHistory, retryStorageKey])

  useEffect(() => {
    let cancelled = false
    async function loadQuestions() {
      setLoading(true); setError(null); setCurrentIndex(0); setAnswers({}); setFinished(false); setReviewOpen(false); setConfirmOpen(false); setElapsedSeconds(0); setRetryHistory([]); setForcePractice(false)
      try {
        sessionStorage.removeItem(retryStorageKey)
      } catch {}
      setSecondsLeft(setup.timed ? setup.durationMinutes * 60 : 0)
      try {
        let base: Question[] = []
        if (exam.questionBanks?.length) {
          const banks = await Promise.all(
            exam.questionBanks.map(async (url) => {
              const response = await fetch(url)
              if (!response.ok) throw new Error("bank load failed")
              return (await response.json()) as BankFile
            })
          )
          base = mapBankQuestions(
            {
              parts: banks.flatMap((bank) =>
                (bank.parts ?? []).map((part) => ({
                  ...part,
                  section: bank.title?.includes("Nghe") ? "Listening" : "Reading",
                }))
              ),
            },
            exam.id,
            setup
          )
          if (!base.length) throw new Error("empty bank")
        } else if (exam.questionBank) {
          const response = await fetch(exam.questionBank)
          if (!response.ok) throw new Error("bank load failed")
          const bank = (await response.json()) as BankFile
          if (!bank.questions?.length) throw new Error("empty bank")
          if (chapterId && chapterId !== "all" && hasChapterSupport(subject.id)) {
            bank.questions = filterQuestionsBySubjectChapter(subject.id, bank.questions, chapterId)
            if (!bank.questions.length) throw new Error("empty bank")
          }
          base = mapBankQuestions(bank, exam.id, setup)
        } else {
          base = buildFallbackQuestions(exam, setup)
        }
        if (!cancelled) setQuestions(base)
      } catch (loadError) {
        console.error(loadError)
        if (!cancelled) { setError(t.loadError); setQuestions([]) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadQuestions()
    return () => { cancelled = true }
  }, [chapterId, exam, reloadToken, setup, subject.id, t.loadError, retryStorageKey])

  useEffect(() => {
    if (finished || loading || error || questions.length === 0) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1)
      if (!setup.timed) return
      setSecondsLeft((current) => {
        if (current <= 1) { window.clearInterval(timer); setFinished(true); return 0 }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [error, finished, loading, questions.length, setup.timed])

  const current = questions[currentIndex]
  const answeredCount = useMemo(() => questions.filter((q) => answers[q.id] !== undefined).length, [answers, questions])
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0
  const stats = useMemo(() => {
    let correct = 0, wrong = 0, skipped = 0
    for (const question of questions) {
      const selected = answers[question.id]
      if (selected === undefined) skipped += 1
      else if (isAnswerCorrect(question, selected)) correct += 1
      else wrong += 1
    }
    const attempted = correct + wrong
    const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100)
    const score10 = questions.length === 0 ? 0 : Math.round(((correct / questions.length) * 10) * 10) / 10
    return { correct, wrong, skipped, accuracy, score10 }
  }, [answers, questions])

  const wrongQuestions = useMemo(() => questions.filter((q) => !isAnswerCorrect(q, answers[q.id])), [questions, answers])

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
    setElapsedSeconds(0)
    setSecondsLeft(setup.timed ? setup.durationMinutes * 60 : 0)
    setTransitionKey((v) => v + 1)
    setForcePractice(true)
  }

  const goToQuestion = (index: number) => { setCurrentIndex(index); setTransitionKey((v) => v + 1) }

  if (loading) return (<CenterCard><p className="lp-modal-desc text-[15px]">{t.loading}</p></CenterCard>)
  if (error || questions.length === 0) return (
    <CenterCard>
      <p className="lp-modal-desc text-[15px]">{error ?? t.loadError}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}>{t.backDocs}</button>
        <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => setReloadToken((v) => v + 1)}>{t.retry}</button>
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
              {current.partTitle ? <p className="font-extrabold text-[#129BDC]">{current.partTitle}</p> : null}
              {current.instruction ? <p className={current.partTitle ? "mt-1" : ""}>{current.instruction}</p> : null}
            </div>
          ) : null}
          {current.imageUrl ? (
            <div className="mb-5 overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <button
                type="button"
                className="block w-full cursor-zoom-in"
                onClick={() => setLightboxImage(current.imageUrl ?? null)}
                aria-label="Xem ảnh phóng to"
              >
                <img
                  src={current.imageUrl}
                  alt={current.partTitle ?? "Reading part image"}
                  className="h-auto w-full object-contain"
                  loading="lazy"
                />
              </button>
              <p className="px-3 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">Nhấn vào ảnh để phóng to</p>
            </div>
          ) : null}
          {current.audioUrl ? (
            <div className="mb-5 rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-extrabold text-[#129BDC]"><span>{t.listeningAudio}</span>{current.audioTimestamp ? <span>{current.audioTimestamp}</span> : null}</div>
              <audio controls preload="metadata" className="w-full" src={current.audioUrl}>Your browser does not support audio playback.</audio>
            </div>
          ) : null}
          {!current.imageUrl && current.passage ? <p className="mb-5 whitespace-pre-line rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 text-[13px] leading-6 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{current.passage}</p> : null}
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
            ) : <div
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
            </div>}
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
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button type="button" className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]" data-state="open" onClick={() => setConfirmOpen(false)} />
          <div className="contact-modal-panel relative z-10 w-full max-w-[420px] rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6" data-state="open">
            <h3 className="lp-modal-title text-[20px]">{t.confirmTitle}</h3>
            <p className="lp-modal-desc mt-2">{t.confirmDesc}</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => setConfirmOpen(false)}>{t.confirmNo}</button>
              <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => { setConfirmOpen(false); setFinished(true) }}>{t.confirmYes}</button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white p-2 text-slate-700 shadow-lg" onClick={() => setLightboxImage(null)} aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
          <img src={lightboxImage} alt="Reading part enlarged" className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  )
}



