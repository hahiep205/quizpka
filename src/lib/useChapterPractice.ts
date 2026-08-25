import { useState } from "react"
import { getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { hasChapterSupport } from "@/data/subjectChapters"
import { goToPracticeGuest } from "@/lib/practiceSession"
import type { QuizSetupValues } from "@/components/QuizSetupModal"

type Lang = "en" | "vi"

export function useChapterPractice(lang: Lang) {
  const [pickerExam, setPickerExam] = useState<ExamCatalogItem | null>(null)
  const [setupExam, setSetupExam] = useState<ExamCatalogItem | null>(null)
  const [pendingChapter, setPendingChapter] = useState<string>("all")

  const handleTryNow = (exam: ExamCatalogItem) => {
    if (hasChapterSupport(exam.subjectId)) {
      setPickerExam(exam)
    } else {
      setSetupExam(exam)
    }
  }

  const handlePickerSelect = (chapterId: string) => {
    if (!pickerExam) return
    setPendingChapter(chapterId)
    setSetupExam(pickerExam)
    setPickerExam(null)
  }

  const handleSetupClose = () => {
    setSetupExam(null)
    setPendingChapter("all")
  }

  const handlePickerClose = () => setPickerExam(null)

  const handleSetupStart = (setup: QuizSetupValues) => {
    if (!setupExam) return
    const hasChapter = hasChapterSupport(setupExam.subjectId)
    goToPracticeGuest({
      examId: setupExam.id,
      subjectId: setupExam.subjectId,
      setup,
      lang,
      chapterId: hasChapter ? pendingChapter : undefined,
    })
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
    handleSetupClose,
    handleSetupStart,
    setPickerExam,
    setSetupExam,
  }
}
