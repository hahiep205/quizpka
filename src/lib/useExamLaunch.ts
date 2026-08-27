import { useState } from "react"
import type { ExamCatalogItem } from "@/data/subjects"
import { tadvExamOptions } from "@/data/tadvExams"
import { useChapterPractice } from "@/lib/useChapterPractice"

type Lang = "en" | "vi"

/**
 * Shared exam launching flow used by both DocumentsPage and DashboardPage.
 *
 * Wraps useChapterPractice and adds the English-placement (TADV) picker:
 * - Clicking a "tieng-anh-dau-vao" exam opens TadvPickerModal instead of the
 *   chapter picker / setup modal.
 * - Selecting a reference swaps the exam id/title/description/banks in place
 *   and forwards it to the quiz setup modal.
 */
export function useExamLaunch(lang: Lang) {
  const practice = useChapterPractice(lang)
  const [tadvPickerExam, setTadvPickerExam] = useState<ExamCatalogItem | null>(null)

  const handleTryNow = (exam: ExamCatalogItem) => {
    if (exam.subjectId === "tieng-anh-dau-vao") {
      setTadvPickerExam(exam)
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

  return {
    ...practice,
    tadvPickerExam,
    handleTryNow,
    handleTadvSelect,
    setTadvPickerExam,
  }
}
