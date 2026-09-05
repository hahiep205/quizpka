import { useEffect, useMemo, useRef, useState } from "react"
import type { Subject, ExamPaper } from "@/data/subjects"
import { useQuizSession } from "@/features/quiz/hooks/useQuizSession"
import { formatTime } from "@/features/quiz/lib/quizHelpers"

type Props = {
  lang: "vi" | "en"
  subject: Subject
  exam: ExamPaper
  onExit: () => void
}

export function DsaiServerQuizSession({ lang, subject, exam, onExit }: Props) {
  const { session, result, loading, error, submissionPending, idempotencyKey, start, submit, resume } = useQuizSession()
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const autoSubmitted = useRef(false)
  const draftKey = `quizpka:dsai-session:${exam.id}:draft:v1`
  const questions = session?.questions ?? []
  const current = questions[currentIndex]
  const answered = Object.keys(answers).length
  const copy = lang === "vi"
    ? { loading: "Đang tạo phiên làm bài...", error: "Không thể tạo phiên làm bài.", next: "Câu tiếp", previous: "Câu trước", submit: "Nộp bài", exit: "Thoát", result: "Kết quả", correct: "Đúng", accuracy: "Độ chính xác", expired: "Phiên đã hết thời gian.", retry: "Thử lại" }
    : { loading: "Creating quiz session...", error: "Unable to create quiz session.", next: "Next", previous: "Previous", submit: "Submit", exit: "Exit", result: "Result", correct: "Correct", accuracy: "Accuracy", expired: "The session expired.", retry: "Retry" }

  useEffect(() => {
    let cancelled = false
    try {
      const raw = sessionStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) as { sessionId?: string; idempotencyKey?: string; answers?: Record<string, number | string>; currentIndex?: number } : null
      if (draft?.sessionId) {
        void resume(draft.sessionId, draft.idempotencyKey).then(() => {
          if (cancelled) return
          if (draft.answers) setAnswers(draft.answers)
          if (typeof draft.currentIndex === "number") setCurrentIndex(Math.max(0, draft.currentIndex))
        })
      } else void start(exam.id)
    } catch { void start(exam.id) }
    return () => { cancelled = true }
  }, [draftKey, exam.id, resume, start])

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

  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0
  const answer = current ? answers[current.id] : undefined
  const canSubmit = questions.length > 0 && !submitting && !result

  useEffect(() => {
    if (!session?.sessionId) return
    try { sessionStorage.setItem(draftKey, JSON.stringify({ sessionId: session.sessionId, idempotencyKey, answers, currentIndex, savedAt: new Date().toISOString() })) } catch { /* Resume draft is best-effort. */ }
  }, [answers, currentIndex, draftKey, idempotencyKey, result, session?.sessionId])

  const submitAnswers = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try { await submit(answers); try { sessionStorage.removeItem(draftKey) } catch { /* ignore */ } } finally { setSubmitting(false) }
  }

  const reviewById = useMemo(() => new Map(result?.questions.map((item) => [item.id, item]) ?? []), [result])

  if (loading && !session) return <div className="mx-auto flex min-h-svh max-w-3xl items-center justify-center px-6"><p>{copy.loading}</p></div>
  if (error && !session) return <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center"><p role="alert">{error.message || copy.error}</p><button type="button" className="lp-btn lp-btn--secondary" onClick={() => void start(exam.id)}>{copy.retry}</button></div>
  if (submissionPending) return <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center"><p role="status">{lang === "vi" ? "Kết quả đang được đồng bộ. Vui lòng thử lại sau ít phút." : "Your result is queued for synchronization. Please try again in a few minutes."}</p><button type="button" className="lp-btn lp-btn--secondary" onClick={() => void submit(answers)}>{copy.retry}</button><button type="button" className="lp-btn lp-btn--secondary" onClick={onExit}>{copy.exit}</button></div>
  if (session?.status === "expired" && !result) return <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center"><p role="alert">{copy.expired}</p><button type="button" className="lp-btn lp-btn--secondary" onClick={onExit}>{copy.exit}</button></div>
  if (result) return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6"><header className="rounded-2xl bg-sky-600 p-6 text-white"><p className="text-sm font-bold uppercase tracking-wider">{copy.result}</p><h1 className="mt-2 text-4xl font-black">{result.score.toFixed(1)}/10</h1><p className="mt-2 font-bold">{result.correct}/{result.total} {copy.correct} · {result.accuracy}% {copy.accuracy}</p>{result.expired && <p className="mt-2 text-sm font-bold">{copy.expired}</p>}</header><section className="space-y-3">{questions.map((question, index) => { const review = reviewById.get(question.id); return <article key={question.id} className={`rounded-xl border p-4 ${review?.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}><p className="font-bold">{index + 1}. {question.prompt}</p><p className="mt-2 text-sm">{review?.isCorrect ? "✓" : "✗"} {question.options[Number(review?.correctAnswer ?? 0)] ?? ""}</p></article> })}</section><button type="button" className="lp-btn lp-btn--secondary" onClick={onExit}>{copy.exit}</button></main>
  if (!current) return <div className="mx-auto flex min-h-svh items-center justify-center px-6"><p>{copy.loading}</p></div>

  return <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 sm:px-6"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-sky-600">{subject.code}</p><h1 className="text-xl font-black text-slate-900 dark:text-white">{exam.title[lang]}</h1></div><div className="rounded-xl bg-slate-100 px-4 py-2 text-lg font-black dark:bg-white/10">{formatTime(secondsLeft)}</div></header><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} /></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-8"><p className="text-sm font-bold text-slate-500">{currentIndex + 1}/{questions.length}</p><h2 className="mt-3 text-lg font-bold leading-8 text-slate-900 dark:text-white">{current.prompt}</h2><div className="mt-6 grid gap-3">{current.options.map((option, index) => <button key={`${current.id}-${index}`} type="button" className={`rounded-xl border-2 p-4 text-left font-semibold transition ${answer === index ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10" : "border-slate-200 hover:border-sky-300 dark:border-white/10"}`} onClick={() => setAnswers((value) => ({ ...value, [current.id]: index }))}>{String.fromCharCode(65 + index)}. {option}</button>)}</div></section><footer className="flex flex-wrap justify-between gap-3"><button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => value - 1)}>{copy.previous}</button><div className="flex gap-3"><button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onExit}>{copy.exit}</button>{currentIndex < questions.length - 1 ? <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => setCurrentIndex((value) => value + 1)}>{copy.next}</button> : <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" disabled={submitting} onClick={() => void submitAnswers()}>{submitting ? "..." : copy.submit}</button>}</div></footer></main>
}
