import { useMemo, useState } from "react"
import { BookOpen, Clock3, FileText, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { QuizSetupModal } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { cn } from "@/lib/utils"
import { documentsCopy as copy } from "@/shared/i18n"
import { useExamLaunch } from "@/lib/useExamLaunch"

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
    handleSetupClose,
    handleSetupStart,
    tadvPickerExam,
    handleTryNow,
    handleTadvSelect,
    setTadvPickerExam,
  } = useExamLaunch(lang)

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
            <Card key={exam.id} variant="interactive" padding="md" className="flex h-full flex-col">
              <CardHeader>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#1CB0F6]">
                  <FileText className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <Badge className="border-0 bg-[#E8F7FE] font-bold text-[#129BDC]">
                  {exam.category.en === "General" ? t.general : t.major}
                </Badge>
              </CardHeader>

              <div className="flex flex-1 flex-col gap-4">
                <div className="space-y-3">
                  <CardTitle className="lp-card-title">{exam.title[lang]}</CardTitle>
                  <p className="lp-card-meta mt-3 inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {exam.subjectName[lang]}
                  </p>
                  <CardDescription className="lp-card-desc line-clamp-2">
                    {exam.description[lang]}
                  </CardDescription>
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
                  onClick={() => handleTryNow(exam)}
                >
                  {t.start}
                </button>
              </CardFooter>
            </Card>
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
            padding="lg"
            className="contact-modal-panel relative z-10 w-full max-w-[480px] shadow-[var(--shadow-3)]"
            data-state="open"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
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

            <div className="space-y-3">
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

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  handleTryNow(detailExam)
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
