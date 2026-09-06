import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { QuizSetupModal } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { LoginNudgeModal, useLoginNudge } from "@/components/LoginNudgeModal"
import { PdfViewerModal } from "@/components/PdfViewerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { DsaiPickerModal } from "@/components/DsaiPickerModal"
import { cn } from "@/lib/utils"
import { documentsCopy as copy } from "@/shared/i18n"
import { useExamLaunch } from "@/lib/useExamLaunch"
import { useSubjectAttemptCounts } from "@/hooks/useSubjectAttemptCounts"
import { CatalogExamCard } from "@/components/CatalogExamCard"
import { PaymentModal } from "@/components/PaymentModal"
import { createPaidCheckout, getPaidProductId, hasProductPurchase } from "@/lib/purchases"
import { useAuth } from "@/auth/AuthProvider"

type Lang = "en" | "vi"
type CategoryFilter = "all" | "general" | "major" | "free" | "paid"

const FEATURED_EXAM_ID = "tadv-sample"

type DocumentsPageProps = {
  lang: Lang
}

export function DocumentsPage({ lang }: DocumentsPageProps) {
  const t = copy[lang]
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<CategoryFilter>("all")
  const [payment, setPayment] = useState<{ payment: { qrUrl: string } } | null>(null)
  const [paymentProductId, setPaymentProductId] = useState("dsai101")
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
    dsaiPickerExam,
    handleDsaiSelect,
    setDsaiPickerExam,
  } = useExamLaunch(lang)
  const attemptCountsBySubject = useSubjectAttemptCounts()
  const nudge = useLoginNudge()
  const { user } = useAuth()
  const tryExam = (exam: ExamCatalogItem) => nudge.requestNudge(async () => { try {
    const productId = getPaidProductId(exam.subjectCode)
    if (!productId || (user?.id && await hasProductPurchase(user.id, productId))) return handleTryNow(exam)
    const result = await createPaidCheckout(productId); if (result.owned) return handleTryNow(exam)
    if (!result.payment) return
    setPaymentProductId(productId)
    setPayment({ payment: result.payment })
    } catch (error) { window.alert(error instanceof Error ? error.message : "Không thể tạo thanh toán. Vui lòng thử lại.") }
  })

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matches = examCatalog.filter((exam) => {
      if (exam.subjectId === "toeic") return false
      const categoryKey = exam.category.en === "General" ? "general" : "major"
      const isPaid = exam.subjectCode === "DSAI101" || exam.subjectCode === "SQA101" || exam.subjectCode === "SEC301"
      const matchType =
        typeFilter === "all"
          ? true
          : typeFilter === "free"
            ? !isPaid
            : typeFilter === "paid"
              ? isPaid
              : categoryKey === typeFilter
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
            <div className="grid min-w-0 grid-cols-3 items-center gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <button
                type="button"
                className={cn("lp-chip w-full min-w-0 px-2 text-xs sm:text-[13px] lg:px-3", typeFilter === "all" && "is-active")}
                onClick={() => setTypeFilter("all")}
              >
                {t.allTypes}
              </button>
              <button
                type="button"
                className={cn("lp-chip w-full min-w-0 px-2 text-xs sm:text-[13px] lg:px-3", typeFilter === "general" && "is-active")}
                onClick={() => setTypeFilter("general")}
              >
                {t.general}
              </button>
              <button
                type="button"
                className={cn("lp-chip w-full min-w-0 px-2 text-xs sm:text-[13px] lg:px-3", typeFilter === "major" && "is-active")}
                onClick={() => setTypeFilter("major")}
              >
                {t.major}
              </button>
              <button
                type="button"
                className={cn("lp-chip w-full min-w-0 px-2 text-xs sm:text-[13px] lg:px-3", typeFilter === "free" && "is-active")}
                onClick={() => setTypeFilter("free")}
              >
                {t.free}
              </button>
              <button
                type="button"
                className={cn("lp-chip w-full min-w-0 px-2 text-xs sm:text-[13px] lg:px-3", typeFilter === "paid" && "is-active")}
                onClick={() => setTypeFilter("paid")}
              >
                {t.paid}
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam) => (
            <CatalogExamCard
              key={exam.id}
              exam={exam}
              lang={lang}
              attemptCount={attemptCountsBySubject[exam.subjectId] ?? 0}
              categoryLabel={exam.category.en === "General" ? t.general : t.major}
              questionsLabel={t.questions}
              footer={
                <button
                  type="button"
                  className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-4 sm:mt-5"
                  onClick={() => tryExam(exam)}
                >
                  {exam.subjectCode === "DSAI101" || exam.subjectCode === "SQA101" || exam.subjectCode === "SEC301" ? "10.000 VND" : t.start}
                </button>
              }
            />
          ))}
        </div>
      )}

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
        noteUrl={pdfChapter?.noteUrl ?? null}
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

      <DsaiPickerModal
        open={Boolean(dsaiPickerExam)}
        lang={lang}
        exam={dsaiPickerExam}
        subject={dsaiPickerExam ? getSubjectById(dsaiPickerExam.subjectId) : null}
        onClose={() => setDsaiPickerExam(null)}
        onSelect={handleDsaiSelect}
      />

      <QuizSetupModal
        open={Boolean(setupExam)}
        lang={lang}
        exam={setupExam}
        subject={setupSubject}
        onClose={handleSetupClose}
        onStart={handleSetupStart}
      />

      <PaymentModal
        open={Boolean(payment)}
        lang={lang}
        payment={payment?.payment ?? null}
        productId={paymentProductId}
        userId={user?.id}
        onClose={() => setPayment(null)}
        onPaid={() => {
          setPayment(null)
          window.location.href = "/dashboard/purchased?payment=success"
        }}
      />
    </section>
  )
}
