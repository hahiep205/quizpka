import { useState } from "react"
import { BadgeCheck, BookOpen, ChevronRight } from "lucide-react"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { QuizSetupModal } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { LoginNudgeModal, useLoginNudge } from "@/components/LoginNudgeModal"
import { PdfViewerModal } from "@/components/PdfViewerModal"
import { ImageDocViewerModal } from "@/components/ImageDocViewerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { DsaiPickerModal } from "@/components/DsaiPickerModal"
import { PaymentModal } from "@/components/PaymentModal"
import { PurchaseDetailDialog } from "@/components/PurchaseDetailDialog"
import { createPaidCheckout, getPaidProductId, hasProductPurchase } from "@/lib/purchases"
import { useExamLaunch } from "@/lib/useExamLaunch"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
import { useAuth } from "@/auth/AuthProvider"
import { appRoutes, navigate } from "@/app/navigation"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { documentsCopy as copy } from "@/shared/i18n"
import type { Language } from "@/shared/types/app"

type Lang = Language

// Thử nghiệm: slug chuẩn là subject.id (vd. /quiz/bao-mat-ung-dung-he-thong).
// Bảng alias giữ tương thích các link rút gọn/tự đặt đã chia sẻ trước đây.
const SLUG_ALIASES: Record<string, string> = {
  "bao-mat-ung-dung-va-he-thong-full": "bao-mat-ung-dung-he-thong",
}

export function resolveQuizSubject(slug: string) {
  return getSubjectById(slug) ?? getSubjectById(SLUG_ALIASES[slug] ?? "")
}

export function QuizDetailPage({ lang, slug }: { lang: Lang; slug: string }) {
  const t = copy[lang]
  const subject = resolveQuizSubject(slug)
  const [payment, setPayment] = useState<{ payment: { qrUrl: string } } | null>(null)
  const [paymentProductId, setPaymentProductId] = useState("dsai101")
  const [purchaseExam, setPurchaseExam] = useState<ExamCatalogItem | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const {
    pickerExam: hcmPickerExam,
    setupExam,
    pickerSubject,
    setupSubject,
    handlePickerSelect,
    handlePickerClose,
    handlePdfClose,
    pdfChapter,
    imageDoc,
    handleImageDocClose,
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
  const nudge = useLoginNudge()
  const { user } = useAuth()

  if (!subject) return <NotFoundPage lang={lang} />

  const exams = examCatalog.filter((exam) => exam.subjectId === subject.id)
  const isPaidSubject = getPaidProductId(subject.code) !== null
  const primaryExam = exams[0]
  const docSetCount = (subject.chapters ?? []).filter((chapter) => chapter.documentId).length
  const [ackTerms, setAckTerms] = useState(false)
  const visibleChapters = (subject.chapters ?? []).filter((chapter) => !chapter.hidden)

  const tryExam = (exam: ExamCatalogItem) => nudge.requestNudge(async () => { try {
    const productId = getPaidProductId(exam.subjectCode)
    if (!productId || (user?.id && await hasProductPurchase(user.id, productId))) return handleTryNow(exam)
    setPurchaseError(null)
    setPurchaseExam(exam)
    } catch (error) { window.alert(error instanceof Error ? error.message : "Không thể tạo thanh toán. Vui lòng thử lại.") }
  })

  const confirmPurchase = async () => {
    if (!purchaseExam || purchaseLoading) return
    const productId = getPaidProductId(purchaseExam.subjectCode)
    if (!productId) return
    setPurchaseLoading(true)
    setPurchaseError(null)
    try {
      const result = await createPaidCheckout(productId)
      if (result.owned) {
        setPurchaseExam(null)
        handleTryNow(purchaseExam)
        return
      }
      if (!result.payment) throw new Error("Chưa cấu hình thông tin tài khoản thanh toán")
      setPaymentProductId(productId)
      setPurchaseExam(null)
      setPayment({ payment: result.payment })
      logActivityEvent(user?.id, "purchase_start", { productId, orderId: result.orderId ?? null })
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Không thể tạo thanh toán. Vui lòng thử lại.")
    } finally {
      setPurchaseLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 pb-20 pt-8 sm:pt-10 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-bold text-slate-400">
        <button type="button" onClick={() => navigate(appRoutes.home)} className="transition-colors hover:text-[#129BDC]">
          {lang === "vi" ? "Trang chủ" : "Home"}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[#100F3E] dark:text-white">{subject.code}</span>
      </nav>

      <section className="mt-4 overflow-hidden rounded-[20px] border-2 border-[#E5E5E5] bg-white shadow-[0_4px_0_#DCDCDC] sm:rounded-[24px] dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
        <div className="bg-gradient-to-b from-[#E8F7FE] to-white p-5 sm:p-8 dark:from-sky-500/10 dark:to-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#1CB0F6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">
              {subject.code}
            </span>
            <span className="rounded-full bg-[#E8F7FE] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
              {isPaidSubject ? (lang === "vi" ? "Trả phí" : "Paid") : (lang === "vi" ? "Miễn phí" : "Free")}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black leading-8 tracking-[-0.02em] text-[#100F3E] sm:text-[32px] sm:leading-10 dark:text-white">
            {subject.name[lang]}
          </h1>
        </div>
        <div className="border-t border-slate-100 p-5 sm:p-8 dark:border-white/10">
          <div className="grid items-start gap-4 md:grid-cols-2">
        {primaryExam ? (
          <div className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] md:order-2 dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
            <div className="rounded-[16px] border border-sky-100 bg-[#F4FBFF] p-4 dark:border-sky-500/15 dark:bg-sky-500/[0.06]">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">{lang === "vi" ? "Ghi chú" : "Note"}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{primaryExam.description[lang]}</p>
            </div>
            {exams.length === 1 ? (
              docSetCount === 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(lang === "vi" ? ["Không giới hạn số lần làm.", "Hạn sử dụng vĩnh viễn.", "Kích hoạt gần như tức thì."] : ["Unlimited attempts.", "Lifetime access.", "Near-instant activation."]).map((perk) => (
                    <span key={perk} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-black text-[#100F3E] dark:border-white/10 dark:bg-slate-900 dark:text-white">
                      <BadgeCheck className="h-3.5 w-3.5 text-[#1CB0F6]" strokeWidth={2.5} />
                      {perk}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-xs font-bold text-slate-400">{lang === "vi" ? "Số bộ đề" : "Exam sets"}</p>
                    <p className="mt-1 text-xl font-black text-[#100F3E] dark:text-white">{docSetCount}</p>
                  </div>
                  <div className="rounded-[14px] bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-xs font-bold text-slate-400">{lang === "vi" ? "Năm thi" : "Exam year"}</p>
                    <p className="mt-1 text-xl font-black text-[#100F3E] dark:text-white">{primaryExam.year}</p>
                  </div>
                </div>
              )
            ) : null}
            {isPaidSubject ? (
              <label className="mt-4 flex cursor-pointer items-start justify-between gap-3 rounded-[14px] border-2 border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <span className="min-w-0 text-xs font-bold leading-5 text-sky-900 dark:text-sky-200">
                  {lang === "vi" ? (
                    <>Tôi đã đọc và đồng ý với <a href="/policy" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="underline">điều khoản sử dụng và chính sách thanh toán</a> của Quizpka.</>
                  ) : (
                    <>I have read and agree to the <a href="/policy" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="underline">Quizpka terms of use and payment policy</a>.</>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={ackTerms}
                  onChange={(event) => setAckTerms(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#1CB0F6]"
                  aria-label={lang === "vi" ? "Tôi đã đọc và đồng ý với điều khoản" : "I agree to the terms"}
                />
              </label>
            ) : null}
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block"
                onClick={() => tryExam(primaryExam)}
              >
                {getPaidProductId(primaryExam.subjectCode) !== null ? "10.000 VND" : t.start}
              </button>
            </div>
          </div>
        ) : null}
        {visibleChapters.length ? (
          <section className="min-w-0 md:order-1">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
            {lang === "vi" ? "Nội dung mở khóa" : "Unlocked content"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-3">
            {visibleChapters.map((chapter) => (
              <div key={chapter.id} className="flex items-center gap-2.5 rounded-[12px] bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                <BookOpen className="h-4 w-4 shrink-0 text-[#1CB0F6]" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-[#100F3E] dark:text-white">{chapter.label[lang]}</p>
                  <p className="text-[11px] font-bold text-slate-400">{chapter.count} {t.questions}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        ) : null}
          </div>
        </div>
      </section>

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

      <ImageDocViewerModal
        open={Boolean(imageDoc)}
        lang={lang}
        title={imageDoc?.title ?? null}
        subjectId={imageDoc?.subjectId ?? null}
        documentId={imageDoc?.documentId ?? null}
        onClose={handleImageDocClose}
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

      <PurchaseDetailDialog
        exam={purchaseExam}
        lang={lang}
        loading={purchaseLoading}
        error={purchaseError}
        defaultAckTerms={ackTerms}
        onClose={() => { if (!purchaseLoading) { setPurchaseExam(null); setPurchaseError(null) } }}
        onConfirm={() => void confirmPurchase()}
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
    </main>
  )
}
