import { useState } from "react"
import { BookOpen, Clock3, FileText, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { QuizSetupModal, type QuizSetupValues } from "@/components/QuizSetupModal"
import { ToeicScopePickerModal } from "@/components/ToeicScopePickerModal"
import { getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { type ToeicScope } from "@/data/toeic"
import { goToPracticeGuest } from "@/lib/practiceSession"
import { toeicSectionCopy as copy } from "@/shared/i18n"
import { getToeicScopeOption } from "@/data/toeic"

type Lang = "en" | "vi"

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[12px] bg-[#F6F7FB] px-4 py-3 dark:bg-white/5">
      <dt className="lp-label text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-extrabold text-[#100F3E] dark:text-white">{value}</dd>
    </div>
  )
}

export function ToeicSection({ lang }: { lang: Lang }) {
  const t = copy[lang]
  const [detailOpen, setDetailOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [selectedScope, setSelectedScope] = useState<ToeicScope>("full")
  const [selectedExamId, setSelectedExamId] = useState<string>("toeic-test-01")

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
    goToPracticeGuest({
      examId: baseExam.id,
      subjectId: subject.id,
      setup,
      lang,
      toeicScope: selectedScope,
    })
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {examCatalogItems.map((exam) => (
          <Card key={exam.id} variant="interactive" padding="md" className="flex h-full flex-col">
          <CardHeader>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#1CB0F6]">
              <FileText className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <Badge className="border-0 bg-[#E8F7FE] font-bold text-[#129BDC]">{t.badge}</Badge>
          </CardHeader>

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-3">
              <CardTitle className="lp-card-title">{exam.title[lang]}</CardTitle>
              <p className="lp-card-meta mt-3 inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                {lang === "vi" ? "Luyện thi TOEIC" : "TOEIC Preparation"}
              </p>
              <CardDescription className="lp-card-desc line-clamp-2">{exam.description[lang]}</CardDescription>
            </div>

            <CardContent className="lp-card-desc flex flex-wrap gap-x-4 gap-y-2 !space-y-0">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                {exam.questionCount} {t.questions}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                {exam.durationMinutes} {t.minutes}
              </span>
            </CardContent>
          </div>

          <CardFooter className="mt-6">
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm flex-1" onClick={() => { setSelectedExamId(exam.id); setDetailOpen(true) }}>
              {t.details}
            </button>
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm flex-1" onClick={() => handleTryNow(exam.id)}>
              {t.start}
            </button>
          </CardFooter>
          </Card>
        ))}
      </div>

      {detailOpen && baseExam ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t.close}
            className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]"
            data-state="open"
            onClick={() => setDetailOpen(false)}
          />
          <Card variant="large" padding="lg" className="contact-modal-panel relative z-10 w-full max-w-[480px] shadow-[var(--shadow-3)]" data-state="open">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="lp-modal-title">{baseExam.title[lang]}</h3>
              </div>
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={() => setDetailOpen(false)} aria-label={t.close}>
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3">
              <DetailRow label={t.subject} value={lang === "vi" ? "Luyện thi TOEIC" : "TOEIC Preparation"} />
              <DetailRow label={t.examType} value={t.badge} />
              <DetailRow label={t.questions} value={`${baseExam.questionCount}`} />
              <DetailRow label={t.expectedTime} value={`${baseExam.durationMinutes} ${t.minutes}`} />
              <div>
                <p className="lp-modal-desc">{baseExam.description[lang]}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => setDetailOpen(false)}>
                {t.close}
              </button>
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm"
                onClick={() => {
                  setDetailOpen(false)
                  handleTryNow(baseExam.id)
                }}
              >
                {t.start}
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      <ToeicScopePickerModal open={pickerOpen} lang={lang} examId={selectedExamId} onClose={() => setPickerOpen(false)} onSelect={handlePickerSelect} />

      <QuizSetupModal open={setupOpen} lang={lang} exam={setupExam} subject={setupSubject} onClose={handleSetupClose} onStart={handleSetupStart} />
    </section>
  )
}
