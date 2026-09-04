import { useState } from "react"
import type { ExamCatalogItem } from "@/data/subjects"
import { tadvExamOptions } from "@/data/tadvExams"
import { dsaiExamOptions } from "@/data/dsaiExams"
import { useChapterPractice } from "@/lib/useChapterPractice"

type Lang = "en" | "vi"

/**
 * Shared exam launching flow used by both DocumentsPage and DashboardPage.
 *
 * Wraps useChapterPractice and adds pickers for multi-set subjects:
 * - Clicking a "tieng-anh-dau-vao" exam opens TadvPickerModal instead of the
 *   chapter picker / setup modal.
 * - Clicking a "khoa-hoc-du-lieu-va-tri-tue-nhan-tao" exam opens
 *   DsaiPickerModal to choose the midterm or final set.
 * - Selecting an option swaps the exam id/title/description/banks in place
 *   and forwards it to the quiz setup modal.
 */
export function useExamLaunch(lang: Lang) {
  const practice = useChapterPractice(lang)
  const [tadvPickerExam, setTadvPickerExam] = useState<ExamCatalogItem | null>(null)
  const [dsaiPickerExam, setDsaiPickerExam] = useState<ExamCatalogItem | null>(null)

  const handleTryNow = (exam: ExamCatalogItem) => {
    if (exam.subjectId === "tieng-anh-dau-vao") {
      setTadvPickerExam(exam)
    } else if (exam.subjectId === "khoa-hoc-du-lieu-va-tri-tue-nhan-tao") {
      setDsaiPickerExam(exam)
    } else {
      practice.handleTryNow(exam)
    }
  }

  const handleTadvSelect = (examId: string) => {
    const opt = tadvExamOptions.find((o) => o.id === examId)
    if (!opt || !tadvPickerExam) return
    const newExam: ExamCatalogItem = {
      ...tadvPickerExam,
      id: opt.id,
      title: opt.title,
      description: opt.description,
      questionBanks: opt.questionBanks,
    }
    practice.setSetupExam(newExam)
    setTadvPickerExam(null)
  }

  const handleDsaiSelect = (examId: string) => {
    const opt = dsaiExamOptions.find((o) => o.id === examId)
    if (!opt || !dsaiPickerExam) return
    const newExam: ExamCatalogItem = {
      ...dsaiPickerExam,
      id: opt.id,
      title: opt.title,
      description: opt.description,
      questionBanks: opt.questionBanks,
      questionCount: opt.questionCount,
      durationMinutes: opt.durationMinutes,
    }
    practice.setSetupExam(newExam)
    setDsaiPickerExam(null)
  }

  return {
    ...practice,
    tadvPickerExam,
    dsaiPickerExam,
    handleTryNow,
    handleTadvSelect,
    handleDsaiSelect,
    setTadvPickerExam,
    setDsaiPickerExam,
  }
}
