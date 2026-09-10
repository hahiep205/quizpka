import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import type { Language } from "@/shared/types/app"

type Lang = Language

export function PurchaseDetailDialog({ exam, lang, loading, error, onClose, onConfirm, defaultAckTerms = false }: {
  exam: ExamCatalogItem | null
  lang: Lang
  loading: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
  defaultAckTerms?: boolean
}) {
  const isVietnamese = lang === "vi"
  const isDocsExam = (exam?.questionCount ?? 0) === 0
  const docSetCount = exam && isDocsExam ? (getSubjectById(exam.subjectId)?.chapters ?? []).filter((chapter) => chapter.documentId).length : 0
  const [ackTerms, setAckTerms] = useState(defaultAckTerms)
  useEffect(() => { setAckTerms(defaultAckTerms) }, [exam?.id, defaultAckTerms])
  return <Dialog
    open={Boolean(exam)}
    onClose={onClose}
    title={isVietnamese ? "Thông tin môn học" : "Subject details"}
    closeLabel={isVietnamese ? "Hủy" : "Cancel"}
    className="z-[85]"
    panelClassName="w-full max-w-[560px] overflow-hidden rounded-[20px] border-2 border-[#E5E5E5] bg-white shadow-[0_7px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
  >
    <header className="flex min-h-[100px] items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5 dark:border-white/10">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#129BDC]">{isVietnamese ? "Quiz dành cho PKAers" : "Quiz for PKAers"}</p>
        <h2 className="mt-1 text-xl font-black leading-7 text-[#100F3E] dark:text-white sm:text-2xl">{exam?.subjectName[lang]}</h2>
      </div>
      <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} disabled={loading} aria-label={isVietnamese ? "Hủy" : "Cancel"}><X className="h-4 w-4" /></button>
    </header>
    <div className="max-h-[min(60dvh,480px)] overflow-y-auto p-4 sm:p-6">
      <div className="rounded-[16px] border border-sky-100 bg-[#F4FBFF] p-4 dark:border-sky-500/15 dark:bg-sky-500/[0.06]">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">{isVietnamese ? "Ghi chú" : "Note"}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{exam?.description[lang]}</p>
        {docSetCount === 0 ? (
          <p className="mt-2 text-sm font-bold leading-6 text-[#129BDC] dark:text-sky-300">{isVietnamese ? "Không giới hạn số lần làm, hạn dùng vĩnh viễn." : "Unlimited attempts, lifetime access."}</p>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] bg-slate-50 p-4 dark:bg-white/5">
          <p className="text-xs font-bold text-slate-400">{docSetCount > 0 ? (isVietnamese ? "Số bộ đề" : "Exam sets") : (isVietnamese ? "Số câu hỏi" : "Questions")}</p>
          <p className="mt-1 text-xl font-black text-[#100F3E] dark:text-white">{docSetCount > 0 ? docSetCount : (exam?.questionCount ?? 0)}</p>
        </div>
        <div className="rounded-[14px] bg-slate-50 p-4 dark:bg-white/5">
          <p className="text-xs font-bold text-slate-400">{docSetCount > 0 ? (isVietnamese ? "Năm thi" : "Exam year") : (isVietnamese ? "Thời lượng" : "Duration")}</p>
          <p className="mt-1 text-xl font-black text-[#100F3E] dark:text-white">{docSetCount > 0 ? (exam?.year ?? "—") : `${exam?.durationMinutes ?? 0} ${isVietnamese ? "phút" : "min"}`}</p>
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start justify-between gap-3 rounded-[14px] border-2 border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
        <span className="min-w-0 text-xs font-bold leading-5 text-sky-900 dark:text-sky-200">
          {isVietnamese ? (
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
          aria-label={isVietnamese ? "Tôi đã đọc và đồng ý với điều khoản" : "I agree to the terms"}
        />
      </label>
      {docSetCount > 0 ? (
        <div className="mt-4 rounded-[14px] border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-xs font-bold leading-5 text-amber-800 dark:text-amber-200">
            {isVietnamese
              ? "Tất cả đề thi đều là ảnh được sưu tầm, gom nhặt qua các năm trước. Lưu ý: Các dạng bài, cấu trúc đề thi có thể được thay đổi theo từng năm. Chỉ nên dùng để tham khảo, KHÔNG NÊN ÔM TỦ!"
              : "All exams are scanned images collected from previous years. Note: question types and exam structure may change from year to year. Use for reference only!"}
          </p>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p> : null}
    </div>
    <footer className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 sm:px-6 dark:border-white/10">
      <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose} disabled={loading}>{isVietnamese ? "Hủy" : "Cancel"}</button>
      <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={onConfirm} disabled={loading || !ackTerms}>{loading ? (isVietnamese ? "Đang tạo đơn..." : "Creating...") : "10.000 VND"}</button>
    </footer>
  </Dialog>
}
