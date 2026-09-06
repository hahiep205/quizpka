import { useEffect, useMemo, useRef, useState } from "react"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3 } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { getExamTitle, type Subject, type ExamPaper } from "@/data/subjects"
import { appRoutes, navigate } from "@/app/navigation"
import { MathText } from "@/components/MathText"
import { useQuizSession } from "@/features/quiz/hooks/useQuizSession"
import { formatTime } from "@/features/quiz/lib/quizHelpers"
import { savePracticeHistory } from "@/lib/practiceSession"
import { StatCard } from "@/features/quiz/ui/StatCard"
import { ResultStamp } from "@/features/quiz/ui/ResultStamp"

type Props = {
  lang: "vi" | "en"
  subject: Subject
  exam: ExamPaper
  setup: QuizSetupValues
  initialSessionId?: string
  onExit: () => void
}

export function DsaiServerQuizSession({ lang, subject, exam, setup, initialSessionId, onExit }: Props) {
  const { user } = useAuth()
  const { session, result, loading, error, submissionPending, idempotencyKey, start, submit, resume } = useQuizSession()
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const autoSubmitted = useRef(false)
  const historySaved = useRef(false)
  const draftKey = `quizpka:dsai-session:${exam.id}:draft:v1`
  const questions = session?.questions ?? []
  const current = questions[currentIndex]
  const answered = Object.keys(answers).length
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0
  const reviewById = useMemo(() => new Map(result?.questions.map((item) => [item.id, item]) ?? []), [result])

  const copy = lang === "vi"
    ? {
        loading: "Đang tạo phiên làm bài...",
        error: "Không thể tạo phiên làm bài.",
        exit: "Thoát bài làm",
        timeLeft: "Thời gian còn",
        question: "Câu",
        of: "trên",
        progress: "Tiến độ",
        practiceMode: "Practice Mode",
        examMode: "Exam Mode",
        quickNav: "Chuyển nhanh",
        previous: "Câu trước",
        next: "Câu tiếp theo",
        submit: "Nộp bài",
         result: "Kết quả",
         score: "Điểm số",
         correct: "Đúng",
         wrong: "Sai",
         skipped: "Bỏ qua",
         accuracy: "Độ chính xác",
         duration: "Thời gian hoàn thành",
         review: "Xem lại bài làm",
         backDocs: "Về danh sách bộ đề",
         mode: "Exam Mode",
        expired: "Phiên đã hết thời gian.",
        retry: "Thử lại",
        syncPending: "Kết quả đang được đồng bộ. Vui lòng thử lại sau ít phút.",
      }
    : {
        loading: "Creating quiz session...",
        error: "Unable to create quiz session.",
        exit: "Exit quiz",
        timeLeft: "Time remaining",
        question: "Question",
        of: "of",
        progress: "Progress",
        practiceMode: "Practice Mode",
        examMode: "Exam Mode",
        quickNav: "Quick navigation",
        previous: "Previous",
        next: "Next question",
        submit: "Submit",
         result: "Result",
         score: "Score",
         correct: "Correct",
         wrong: "Wrong",
         skipped: "Skipped",
         accuracy: "Accuracy",
         duration: "Time spent",
         review: "Review answers",
         backDocs: "Back to documents",
         mode: "Exam Mode",
        expired: "The session expired.",
        retry: "Retry",
        syncPending: "Your result is being synchronized. Please retry in a few minutes.",
      }

  useEffect(() => {
    let cancelled = false
    try {
      const raw = sessionStorage.getItem(draftKey)
      const draft = raw
        ? JSON.parse(raw) as { sessionId?: string; idempotencyKey?: string; answers?: Record<string, number | string>; currentIndex?: number }
        : null
      if (initialSessionId) {
        void resume(initialSessionId, draft?.idempotencyKey).then(() => {
          if (cancelled) return
          if (draft?.answers) setAnswers(draft.answers)
        })
      } else if (draft?.sessionId) {
        void resume(draft.sessionId, draft.idempotencyKey).then(() => {
          if (cancelled) return
          if (draft.answers) setAnswers(draft.answers)
          if (typeof draft.currentIndex === "number") setCurrentIndex(Math.max(0, draft.currentIndex))
        })
      } else {
        void start(exam.id)
      }
    } catch {
      void start(exam.id)
    }
    return () => { cancelled = true }
  }, [draftKey, exam.id, initialSessionId, resume, start])

  useEffect(() => {
    if (!session?.expiresAt || result) return
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [result, session?.expiresAt])

  useEffect(() => {
    if (!session || !questions.length || result || secondsLeft > 0 || Date.parse(session.expiresAt) > Date.now() || autoSubmitted.current) return
    autoSubmitted.current = true
    setSubmitting(true)
    void submit(answers).finally(() => setSubmitting(false))
  }, [answers, questions.length, result, secondsLeft, session, submit])

  useEffect(() => {
    if (!session?.sessionId || result) return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        sessionId: session.sessionId,
        idempotencyKey,
        answers,
        currentIndex,
        savedAt: new Date().toISOString(),
      }))
    } catch {
      // Resume draft is best-effort.
    }
  }, [answers, currentIndex, draftKey, idempotencyKey, result, session?.sessionId])

  const submitAnswers = async () => {
    if (!questions.length || submitting || result) return
    setSubmitting(true)
    try {
      const submitted = await submit(answers)
      if (user?.id && !historySaved.current) {
        historySaved.current = true
        savePracticeHistory({
          id: submitted.attemptId,
          examId: exam.id,
          subjectId: subject.id,
          title: getExamTitle(exam, lang),
          mode: setup.mode,
          score: submitted.score,
          correct: submitted.correct,
          total: submitted.total,
          accuracy: submitted.accuracy,
          durationSeconds: submitted.durationSeconds,
          completedAt: new Date().toISOString(),
          setup,
          lang,
          wrongQuestions: submitted.questions
            .filter((review) => !review.isCorrect)
            .map((review) => {
              const question = questions.find((item) => item.id === review.id)
              const correctAnswer = review.correctAnswer === null || review.correctAnswer === undefined
                ? ""
                : question?.options[review.correctAnswer] ?? ""
              return {
                id: review.id,
                prompt: question?.prompt ?? "",
                correctAnswer,
                wasSkipped: review.selectedAnswer === null,
              }
            }),
        }, user.id)
      }
      try { sessionStorage.removeItem(draftKey) } catch { /* Storage is optional. */ }
      navigate(appRoutes.result, { replace: true, search: `?sessionId=${encodeURIComponent(submitted.sessionId)}` })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !session) return <div className="mx-auto flex min-h-svh max-w-3xl items-center justify-center px-6"><p>{copy.loading}</p></div>
  if (error && !session) return <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center"><p role="alert">{error.message || copy.error}</p><button type="button" className="lp-btn lp-btn--secondary" onClick={() => void start(exam.id)}>{copy.retry}</button></div>
  if (submissionPending) return <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center"><p role="status">{copy.syncPending}</p><button type="button" className="lp-btn lp-btn--secondary" onClick={() => void submitAnswers()}>{copy.retry}</button><button type="button" className="lp-btn lp-btn--secondary" onClick={onExit}>{copy.exit}</button></div>
  if (session?.status === "expired" && !result) return <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center"><p role="alert">{copy.expired}</p><button type="button" className="lp-btn lp-btn--secondary" onClick={onExit}>{copy.exit}</button></div>

  if (result) return (
    <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}><ArrowLeft className="h-4 w-4" />{copy.exit}</button>
        <div className="rounded-full border-2 border-[#E5E5E5] bg-white px-4 py-2 text-sm font-extrabold shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900">{copy.result}: {result.score.toFixed(1)}/10 · {result.correct}/{result.total} {copy.correct} · {result.accuracy}%</div>
      </div>
      <div className="quiz-result-card rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="lp-label text-[12px] uppercase tracking-[0.12em]">{setup.mode === "practice" ? copy.practiceMode : copy.mode}</p>
            <h1 className="lp-section-heading mt-2 text-[28px]">{copy.result}</h1>
            <p className="lp-modal-desc mt-2">{getExamTitle(exam, lang)}</p>
          </div>
          <div className="mx-auto flex min-h-[112px] w-full max-w-[220px] flex-col items-center justify-center rounded-[16px] bg-[#F6F7FB] px-5 py-4 text-center dark:bg-white/5 sm:mx-0">
            <p className="lp-label text-[12px]">{copy.score}</p>
            <p className="mt-1 text-[36px] font-extrabold tracking-[-0.04em] text-[#100F3E] dark:text-white">{result.score.toFixed(1)}<span className="text-[18px] font-bold text-[#777777]">/10</span></p>
          </div>
        </div>
        <div className="relative mt-6">
          <div className="grid grid-cols-2 grid-rows-3 gap-3">
            <StatCard label={copy.correct} value={`${result.correct}`} />
            <StatCard label={copy.wrong} value={`${result.total - result.correct}`} />
            <StatCard label={copy.skipped} value={`${result.questions.filter((item) => item.selectedAnswer === null).length}`} />
            <StatCard label={copy.accuracy} value={`${result.accuracy}%`} />
            <StatCard label={copy.duration} value={formatTime(result.durationSeconds)} />
            <StatCard label={copy.progress} value="100%" />
          </div>
          {(setup.mode === "exam") && <ResultStamp score={result.score} />}
        </div>
        <div className="mt-6 border-t border-[#E5E5E5] pt-6 dark:border-white/10">
          <p className="lp-label mb-4">{copy.review}</p>
          <div className="space-y-5">
            {questions.map((question, index) => {
              const review = reviewById.get(question.id)
              const correctOption = review?.correctAnswer === null || review?.correctAnswer === undefined ? "" : question.options[review.correctAnswer]
              return <section key={question.id} className="border-b border-[#E5E5E5] pb-5 last:border-b-0 last:pb-0 dark:border-white/10"><p className="lp-label mb-2">{copy.question} {index + 1}</p><p className="whitespace-pre-line text-[15px] font-bold leading-6"><MathText text={question.prompt} /></p><p className={review?.isCorrect ? "mt-2 font-bold text-emerald-600" : "mt-2 font-bold text-rose-600"}>{review?.isCorrect ? "✓" : "✗"} <MathText text={correctOption ?? ""} /></p></section>
            })}
          </div>
        </div>
      </div>
    </main>
  )

  if (!current) return <div className="mx-auto flex min-h-svh items-center justify-center px-6"><p>{copy.loading}</p></div>

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}><ArrowLeft className="h-4 w-4" />{copy.exit}</button>
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[13px] font-extrabold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:text-white"><Clock3 className="h-4 w-4 text-[#1CB0F6]" />{copy.timeLeft}: {formatTime(secondsLeft)}</div>
      </div>

      <div className="mb-4 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3"><span className="lp-label">{copy.question} {currentIndex + 1} {copy.of} {questions.length}</span><span className="lp-label text-[#1CB0F6]">{copy.progress}: {progress}%</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-white/10"><div className="h-full rounded-full bg-[#1CB0F6] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,280px)]">
        <div className="quiz-question-panel rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><p className="lp-label text-[12px] uppercase tracking-[0.12em]">{subject.code} · {setup.mode === "practice" ? copy.practiceMode : copy.examMode}</p><p className="lp-card-meta">{subject.name[lang]}</p></div>
          <section className="border-b border-[#E5E5E5] pb-5 last:border-b-0 last:pb-0 dark:border-white/10">
            <p className="lp-label mb-2 text-[12px] uppercase tracking-[0.12em]">{copy.question} {currentIndex + 1}</p>
            <h2 className="whitespace-pre-line text-[13px] font-bold leading-5 tracking-normal sm:text-[13px]"><MathText text={current.prompt} /></h2>
            <div className="mt-3 flex flex-col gap-1.5 sm:grid sm:grid-cols-2 sm:gap-2">
              {current.options.map((option, index) => <button key={`${current.id}-${index}`} type="button" className={`flex w-full items-center gap-1.5 rounded-[9px] border-2 px-2.5 py-1.5 text-left text-[12px] font-semibold transition-all duration-100 sm:gap-2 sm:px-3 sm:py-2 ${answers[current.id] === index ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_3px_0_#189CD8]" : "border-[#E5E5E5] bg-white text-[#4B4B4B] shadow-[0_3px_0_#DCDCDC] hover:-translate-y-px dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"}`} onClick={() => setAnswers((value) => ({ ...value, [current.id]: index }))}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-extrabold sm:h-6 sm:w-6 sm:text-[10px] ${answers[current.id] === index ? "border-white/40 bg-white/15 text-white" : "border-[#E5E5E5] bg-[#F6F7FB] text-[#100F3E] dark:border-white/15 dark:bg-transparent dark:text-white"}`}>{String.fromCharCode(65 + index)}</span><span className="flex-1 font-bold leading-4"><MathText text={option} /></span></button>)}
            </div>
            {setup.mode === "practice" && answers[current.id] !== undefined && current.explanation ? <div className="lp-modal-desc mt-3 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-3 py-2.5 text-[13px] text-[#100F3E] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100"><span className="font-extrabold text-[#1CB0F6]">{lang === "vi" ? "Giải thích" : "Explanation"}: </span><span className="whitespace-pre-line"><MathText text={current.explanation} /></span></div> : null}
          </section>
          <div className="mt-8 flex flex-row gap-3 sm:justify-between"><button type="button" className="lp-btn lp-btn--secondary lp-btn--sm w-1/2 min-w-0 flex-1 disabled:opacity-50 sm:w-auto sm:flex-none" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => value - 1)}><ChevronLeft className="h-4 w-4" />{copy.previous}</button>{currentIndex < questions.length - 1 ? <button type="button" className="lp-btn lp-btn--primary lp-btn--sm w-1/2 min-w-0 flex-1 sm:w-auto sm:flex-none" onClick={() => setCurrentIndex((value) => value + 1)}>{copy.next}<ChevronRight className="h-4 w-4" /></button> : <button type="button" className="lp-btn lp-btn--primary lp-btn--sm w-1/2 min-w-0 flex-1 sm:w-auto sm:flex-none" disabled={submitting} onClick={() => void submitAnswers()}>{submitting ? "..." : copy.submit}</button>}</div>
        </div>

        <aside className="min-w-0 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-3 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-4"><p className="lp-label mb-3">{copy.quickNav}</p><div className="max-h-[420px] overflow-x-hidden overflow-y-auto pr-1"><div className="grid grid-cols-4 gap-[5px] pb-1">{questions.map((question, index) => <button key={question.id} type="button" className={`box-border flex h-[32px] w-full min-w-0 items-center justify-center rounded-[9px] border-2 text-[11px] font-extrabold transition-transform active:translate-y-[1px] ${currentIndex === index ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : answers[question.id] !== undefined ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-[#E5E5E5] bg-[#F6F7FB] text-[#777777] dark:border-white/10 dark:bg-transparent dark:text-slate-300"}`} onClick={() => setCurrentIndex(index)}>{index + 1}</button>)}</div></div><button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-4" disabled={submitting} onClick={() => void submitAnswers()}>{submitting ? "..." : copy.submit}</button></aside>
      </div>
    </main>
  )
}
