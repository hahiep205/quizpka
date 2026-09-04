import { useState } from "react"
import { getSubjectById, type ChapterOption, type ExamCatalogItem } from "@/data/subjects"
import { hasChapterSupport } from "@/data/subjectChapters"
import { goToPractice } from "@/lib/practiceSession"
import { beginAttemptSession, currentAttemptSession, logActivityEvent } from "@/features/activity/lib/activityLog"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { useAuth } from "@/auth/AuthProvider"

type Lang = "en" | "vi"

export function useChapterPractice(lang: Lang) {
  const { status, user } = useAuth()
  const [pickerExam, setPickerExam] = useState<ExamCatalogItem | null>(null)
  const [setupExam, setSetupExam] = useState<ExamCatalogItem | null>(null)
  const [pendingChapter, setPendingChapter] = useState<string>("all")
  const [pdfChapter, setPdfChapter] = useState<{ title: ChapterOption["label"]; url: string; noteUrl: string | null } | null>(null)

  const handleTryNow = (exam: ExamCatalogItem) => {
    const sessionId = beginAttemptSession(exam.id)
    logActivityEvent(user?.id, "open_exam", { examId: exam.id, subjectId: exam.subjectId, sessionId })
    if (hasChapterSupport(exam.subjectId)) {
      setPickerExam(exam)
    } else {
      setSetupExam(exam)
    }
  }

  const handlePickerSelect = (chapterId: string) => {
    if (!pickerExam) return
    const subject = getSubjectById(pickerExam.subjectId)
    const option = subject?.chapters?.find((chapter) => chapter.id === chapterId)
    if (!option) return
    if (option?.pdfUrl) {
      setPdfChapter({ title: option.label, url: option.pdfUrl, noteUrl: option.noteUrl ?? null })
      setPickerExam(null)
      return
    }
    setPendingChapter(chapterId)
    setSetupExam(pickerExam)
    setPickerExam(null)
  }

  const handlePdfClose = () => setPdfChapter(null)

  const handleSetupClose = () => {
    setSetupExam(null)
    setPendingChapter("all")
  }

  const handlePickerClose = () => setPickerExam(null)

  const handleSetupStart = (setup: QuizSetupValues) => {
    if (!setupExam) return
    const hasChapter = hasChapterSupport(setupExam.subjectId)
    logActivityEvent(user?.id, "start_attempt", {
      examId: setupExam.id,
      subjectId: setupExam.subjectId,
      mode: setup.mode,
      chapterId: hasChapter ? pendingChapter : undefined,
      sessionId: currentAttemptSession(setupExam.id) ?? beginAttemptSession(setupExam.id),
    })
    goToPractice({
      examId: setupExam.id,
      subjectId: setupExam.subjectId,
      setup,
      lang,
      chapterId: hasChapter ? pendingChapter : undefined,
    }, status === "authenticated")
    setPendingChapter("all")
  }

  const pickerSubject = pickerExam ? getSubjectById(pickerExam.subjectId) : null
  const setupSubject = setupExam ? getSubjectById(setupExam.subjectId) : null

  return {
    pickerExam,
    setupExam,
    pendingChapter,
    pickerSubject,
    setupSubject,
    handleTryNow,
    handlePickerSelect,
    handlePickerClose,
    handlePdfClose,
    pdfChapter,
    handleSetupClose,
    handleSetupStart,
    setPickerExam,
    setSetupExam,
  }
}
