import { useState } from "react"
import { getSubjectById, type ChapterOption, type ExamCatalogItem } from "@/data/subjects"
import { hasChapterSupport } from "@/data/subjectChapters"
import { goToPractice } from "@/lib/practiceSession"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { useAuth } from "@/auth/AuthProvider"

type Lang = "en" | "vi"

export function useChapterPractice(lang: Lang) {
  const { status } = useAuth()
  const [pickerExam, setPickerExam] = useState<ExamCatalogItem | null>(null)
  const [setupExam, setSetupExam] = useState<ExamCatalogItem | null>(null)
  const [pendingChapter, setPendingChapter] = useState<string>("all")
  const [pdfChapter, setPdfChapter] = useState<{ title: ChapterOption["label"]; url: string } | null>(null)

  const handleTryNow = (exam: ExamCatalogItem) => {
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
    if (option?.pdfUrl) {
      setPdfChapter({ title: option.label, url: option.pdfUrl })
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
