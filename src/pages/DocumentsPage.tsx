import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { QuizSetupModal } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { LoginNudgeModal, useLoginNudge } from "@/components/LoginNudgeModal"
import { PdfViewerModal } from "@/components/PdfViewerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { cn, mobileModalHeightClass } from "@/lib/utils"
import { documentsCopy as copy } from "@/shared/i18n"
import { useExamLaunch } from "@/lib/useExamLaunch"
import { useSubjectAttemptCounts } from "@/hooks/useSubjectAttemptCounts"
import { CatalogExamCard } from "@/components/CatalogExamCard"

type Lang = "en" | "vi"
type CategoryFilter = "all" | "general" | "major"

const FEATURED_EXAM_ID = "tadv-sample"

type DocumentsPageProps = {
  lang: Lang
}

export function DocumentsPage({ lang }: DocumentsPageProps) {
  const t = copy[lang]
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<CategoryFilter>("all")
  const [detailExam, setDetailExam] = useState<ExamCatalogItem | null>(null)
  const {
    pickerExam: hcmPickerExam,
    setupExam,
    pickerSubject,
    setupSubject,
    handlePickerSelect,
    handlePickerClose,
    handlePdfClose,
    pdfChapter,
    handleSetupClose,
    handleSetupStart,
    tadvPickerExam,
    handleTryNow,
    handleTadvSelect,
    setTadvPickerExam,
  } = useExamLaunch(lang)
  const attemptCountsBySubject = useSubjectAttemptCounts()
  const nudge = useLoginNudge()
  const tryExam = (exam: ExamCatalogItem) => nudge.requestNudge(() => handleTryNow(exam))

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matches = examCatalog.filter((exam) => {
      if (exam.subjectId === "toeic") return false
      const categoryKey = exam.category.en === "General" ? "general" : "major"
      const matchType = typeFilter === "all" || categoryKey === typeFilter
      const subjectHaystack = [
        exam.subjectName.en,
        exam.subjectName.vi,
        exam.subjectCode,
      ]
        .join(" ")
        .toLowerCase()
      const matchSubject = !normalized || subjectHaystack.includes(normalized)
      return matchType && matchSubject
    })
    return typeFilter === "all"
      ? matches.sort((a, b) => Number(b.id === FEATURED_EXAM_ID) - Number(a.id === FEATURED_EXAM_ID))
      : matches
  }, [query, typeFilter])

  return (
    <section
      id="docs"
      className="mx-auto flex w-full max-w-[1120px] flex-col scroll-mt-28 border-t border-slate-200 px-6 pb-20 pt-14 dark:border-white/10 lg:px-8 lg:pb-24 lg:pt-16"
    >
      <div className="mb-10 flex flex-col gap-6">
        <div className="py-4 text-center sm:py-6">
          <h2 className="lp-section-heading">
            {t.title} <span className="name-logo">{t.brand}</span>
          </h2>
          <p className="lp-section-subheading mx-auto mt-0 text-center">
            {t.subtitle}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative min-w-0 w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-12 w-full min-w-0 rounded-[12px] border-[2px] border-[#E5E5E5] pl-10 pr-4 font-semibold"
            />
          </label>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <p className="lp-label shrink-0 lg:hidden">{t.filterByType}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                className={cn("lp-chip", typeFilter === "all" && "is-active")}
                onClick={() => setTypeFilter("all")}
              >
                {t.allTypes}
              </button>
              <button
                type="button"
                className={cn("lp-chip", typeFilter === "general" && "is-active")}
                onClick={() => setTypeFilter("general")}
              >
                {t.general}
              </button>
              <button
                type="button"
                className={cn("lp-chip", typeFilter === "major" && "is-active")}
                onClick={() => setTypeFilter("major")}
              >
                {t.major}
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <Card variant="dashed" padding="lg" className="px-6 py-16 text-center">
          <p className="lp-card-desc text-[15px]">{t.empty}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam) => (
            <CatalogExamCard
              key={exam.id}
              exam={exam}
              lang={lang}
              attemptCount={attemptCountsBySubject[exam.subjectId] ?? 0}
              categoryLabel={exam.category.en === "General" ? t.general : t.major}
              questionsLabel={t.questions}
              minutesLabel={t.minutes}
              footer={
                <div className="mt-4 flex items-center gap-3 sm:mt-5">
                  <button
                    type="button"
                    className="lp-btn lp-btn--secondary lp-btn--sm flex-1"
                    onClick={() => setDetailExam(exam)}
                  >
                    {t.details}
                  </button>
                  <button
                    type="button"
                    className="lp-btn lp-btn--primary lp-btn--sm flex-1"
                    onClick={() => tryExam(exam)}
                  >
                    {t.start}
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {detailExam ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t.close}
            className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]"
            data-state="open"
            onClick={() => setDetailExam(null)}
          />
          <Card
            variant="large"
            padding="none"
            className={cn("contact-modal-panel relative z-10 flex w-full max-w-[480px] flex-col overflow-hidden shadow-[var(--shadow-3)]", mobileModalHeightClass)}
            data-state="open"
          >
            <div className="flex min-h-[128px] shrink-0 items-start justify-between gap-3 border-b border-[#E5E5E5] px-6 py-5 dark:border-white/10 sm:min-h-0">
              <div>
                <h3 className="lp-modal-title">
                  {detailExam.title[lang]}
                </h3>
              </div>
              <button
                type="button"
                className="lp-btn lp-btn--secondary lp-btn--icon"
                onClick={() => setDetailExam(null)}
                aria-label={t.close}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
              <DetailRow label={t.subject} value={detailExam.subjectName[lang]} />
              <DetailRow
                label={t.examType}
                value={detailExam.category.en === "General" ? t.general : t.major}
              />
              <DetailRow
                label={t.questions}
                value={`${detailExam.questionCount}`}
              />
              <DetailRow
                label={t.expectedTime}
                value={`${detailExam.durationMinutes} ${t.minutes}`}
              />
              <div>
                <p className="lp-modal-desc">
                  {detailExam.description[lang]}
                </p>
              </div>
            </div>

            <div className="flex min-h-[124px] shrink-0 flex-col-reverse gap-3 border-t border-[#E5E5E5] px-6 py-4 dark:border-white/10 sm:min-h-0 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="lp-btn lp-btn--secondary lp-btn--sm"
                onClick={() => setDetailExam(null)}
              >
                {t.close}
              </button>
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm"
                onClick={() => {
                  tryExam(detailExam)
                  setDetailExam(null)
                }}
              >
                {t.start}
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      <HcmChapterPickerModal
        open={Boolean(hcmPickerExam)}
        lang={lang}
        exam={hcmPickerExam}
        subject={pickerSubject}
        onClose={handlePickerClose}
        onSelect={handlePickerSelect}
      />

      <LoginNudgeModal
        open={nudge.nudgeOpen}
        lang={lang}
        onSkip={nudge.skipNudge}
        onClose={nudge.closeNudge}
      />

      <PdfViewerModal
        open={Boolean(pdfChapter)}
        lang={lang}
        title={pdfChapter?.title ?? null}
        pdfUrl={pdfChapter?.url ?? null}
        onClose={handlePdfClose}
      />

      <TadvPickerModal
        open={Boolean(tadvPickerExam)}
        lang={lang}
        exam={tadvPickerExam}
        subject={tadvPickerExam ? getSubjectById(tadvPickerExam.subjectId) : null}
        onClose={() => setTadvPickerExam(null)}
        onSelect={handleTadvSelect}
      />

      <QuizSetupModal
        open={Boolean(setupExam)}
        lang={lang}
        exam={setupExam}
        subject={setupSubject}
        onClose={handleSetupClose}
        onStart={handleSetupStart}
      />
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[12px] bg-[#F6F7FB] px-4 py-3 dark:bg-white/5">
      <dt className="lp-label text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-extrabold text-[#100F3E] dark:text-white">
        {value}
      </dd>
    </div>
  )
}
