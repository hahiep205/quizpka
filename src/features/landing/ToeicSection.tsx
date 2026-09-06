import { useState } from "react"
import { QuizSetupModal, type QuizSetupValues } from "@/components/QuizSetupModal"
import { ToeicScopePickerModal } from "@/components/ToeicScopePickerModal"
import { LoginNudgeModal, useLoginNudge } from "@/components/LoginNudgeModal"
import { getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { type ToeicScope } from "@/data/toeic"
import { goToPractice } from "@/lib/practiceSession"
import { toeicSectionCopy as copy } from "@/shared/i18n"
import { getToeicScopeOption } from "@/data/toeic"
import { useAuth } from "@/auth/AuthProvider"
import { useSubjectAttemptCounts } from "@/hooks/useSubjectAttemptCounts"
import { CatalogExamCard } from "@/components/CatalogExamCard"

type Lang = "en" | "vi"

export function ToeicSection({ lang }: { lang: Lang }) {
  const { status } = useAuth()
  const t = copy[lang]
  const attemptCountsBySubject = useSubjectAttemptCounts()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [selectedScope, setSelectedScope] = useState<ToeicScope>("full")
  const [selectedExamId, setSelectedExamId] = useState<string>("toeic-test-01")
  const nudge = useLoginNudge()

  const subject = getSubjectById("toeic")
  const examCatalogItems: ExamCatalogItem[] = subject
    ? subject.exams.map((exam) => ({
        ...exam,
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        category: subject.category,
      }))
    : []
  const baseExam = examCatalogItems.find((exam) => exam.id === selectedExamId) ?? null

  const handleTryNow = (examId: string) => {
    setSelectedExamId(examId)
    setPickerOpen(true)
  }

  const tryExam = (examId: string) => nudge.requestNudge(() => handleTryNow(examId))

  const handlePickerSelect = (scope: ToeicScope) => {
    setSelectedScope(scope)
    setPickerOpen(false)
    // small delay to allow picker close animation before opening setup
    window.setTimeout(() => setSetupOpen(true), 180)
  }

  const handleSetupClose = () => {
    setSetupOpen(false)
  }

  const handleSetupStart = (setup: QuizSetupValues) => {
    if (!baseExam || !subject) return
    goToPractice({
      examId: baseExam.id,
      subjectId: subject.id,
      setup,
      lang,
      toeicScope: selectedScope,
    }, status === "authenticated")
  }

  // derive display exam for setup modal (override count/duration per scope)
  const scopeOption = getToeicScopeOption(selectedScope, selectedExamId)
  const setupExam: ExamCatalogItem | null = baseExam
    ? {
        ...baseExam,
        questionCount: scopeOption?.count ?? baseExam.questionCount,
        durationMinutes: scopeOption?.durationMinutes ?? baseExam.durationMinutes,
        // keep title as base but scope will be visible via setup? Alternatively append scope label
        title: scopeOption
          ? {
              en: `${baseExam.title.en} - ${scopeOption.label.en}`,
              vi: `${baseExam.title.vi} - ${scopeOption.label.vi}`,
            }
          : baseExam.title,
      }
    : null
  const setupSubject = subject

  return (
    <section
      id="features"
      className="mx-auto flex w-full max-w-[1120px] flex-col scroll-mt-28 border-t border-slate-200 px-6 pb-20 pt-14 dark:border-white/10 lg:px-8 lg:pb-24 lg:pt-16"
    >
      <div className="mb-10 flex flex-col gap-6">
        <div className="py-4 text-center sm:py-6">
          <h2 className="lp-section-heading">
            {t.title} <span className="name-logo">{t.brand}</span>
          </h2>
          <p className="lp-section-subheading mx-auto mt-0 text-center">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {examCatalogItems.map((exam) => (
          <CatalogExamCard
            key={exam.id}
            exam={exam}
            lang={lang}
            attemptCount={attemptCountsBySubject[exam.subjectId] ?? 0}
            categoryLabel={t.badge}
            questionsLabel={t.questions}
            footer={
              <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-4 sm:mt-5" onClick={() => tryExam(exam.id)}>
                {t.start}
              </button>
            }
          />
        ))}
      </div>

      <ToeicScopePickerModal open={pickerOpen} lang={lang} examId={selectedExamId} onClose={() => setPickerOpen(false)} onSelect={handlePickerSelect} />

      <LoginNudgeModal open={nudge.nudgeOpen} lang={lang} onSkip={nudge.skipNudge} onClose={nudge.closeNudge} />

      <QuizSetupModal open={setupOpen} lang={lang} exam={setupExam} subject={setupSubject} onClose={handleSetupClose} onStart={handleSetupStart} />
    </section>
  )
}
