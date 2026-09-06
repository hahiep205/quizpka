import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { contactCopy as copy } from "@/shared/i18n"
import { cn, modalBodyClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"
import { submitSupportReport, type SupportType } from "@/features/support/api/supportReports"

export type ContactModalType = "Contribute" | "Support" | "Report"

type ContactModalProps = {
  open: boolean
  type: ContactModalType | null
  onClose: () => void
  lang?: "en" | "vi"
}

export function ContactModal({ open, type, onClose, lang = "vi" }: ContactModalProps) {
  const t = copy[lang]
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  if (!type) return null

  const heading = type === "Contribute" ? t.contributeTitle : type === "Report" ? "Báo lỗi hệ thống" : t.supportTitle
  const supportType: SupportType = type === "Contribute" ? "contribute" : type === "Report" ? "report" : "feedback"
  const formTitle = type === "Contribute" ? "Đóng góp tài liệu" : type === "Report" ? "Báo lỗi hệ thống" : "Góp ý"
  const handleSubmit = () => {
    if (!subject.trim() || !description.trim()) {
      setResult("Vui lòng nhập tiêu đề và mô tả lỗi.")
      return
    }
    setSending(true)
    setResult(null)
    void submitSupportReport({ type: supportType, subject: subject.trim(), description: description.trim(), pageUrl: window.location.href })
      .then(() => { setResult(`Đã ghi nhận ${formTitle.toLowerCase()}. Cảm ơn bạn đã đóng góp.`); setSubject(""); setDescription("") })
      .catch((error: unknown) => setResult(error instanceof Error ? error.message : `Không thể gửi ${formTitle.toLowerCase()}.`))
      .finally(() => setSending(false))
  }

  return (
    <Dialog open={open} onClose={onClose} title={heading} closeLabel={t.closeModal} panelClassName={cn("max-w-[520px] rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[var(--shadow-3)] dark:border-white/10 dark:bg-slate-900", modalFrameClass)}>
        <div className={modalHeaderClass}>
          <h2 className="lp-modal-title text-[17px]">
            {heading}
          </h2>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon h-8 w-8" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className={cn(modalBodyClass, "!overflow-hidden bg-[#F6F7FB] p-3 dark:bg-slate-900 sm:p-3.5")}>
          <div className="h-full overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white shadow-[0_2px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900">
            {type === "Report" || type === "Contribute" || type === "Support" ? (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex gap-3 rounded-xl bg-sky-50 p-3 text-sm font-semibold leading-5 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">{type === "Report" ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : null}{type === "Report" ? "Mô tả càng cụ thể càng giúp chúng tôi xử lý nhanh hơn." : "Nội dung của bạn sẽ được gửi tới đội ngũ QuizPKA để tiếp nhận và xử lý."}</div>
                <label className="block text-sm font-black">{type === "Report" ? "Tiêu đề lỗi" : type === "Contribute" ? "Tên tài liệu / chủ đề" : "Tiêu đề góp ý"}<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} placeholder={type === "Report" ? "Ví dụ: Không mở được đề thi" : type === "Contribute" ? "Ví dụ: Tài liệu ôn tập..." : "Ví dụ: Đề xuất cải thiện..."} className="mt-2 h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" /></label>
                <label className="block text-sm font-black">{type === "Report" ? "Mô tả lỗi" : type === "Contribute" ? "Mô tả / đường dẫn tài liệu" : "Nội dung góp ý"}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={6} placeholder={type === "Report" ? "Các bước đã thực hiện, thông báo lỗi..." : "Nhập nội dung chi tiết..."} className="mt-2 w-full resize-y rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" /></label>
                {result ? <p role="status" className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{result}</p> : null}
                <button type="button" disabled={sending} onClick={handleSubmit} className="lp-btn lp-btn--primary w-full">{sending ? "Đang gửi..." : `Gửi ${formTitle.toLowerCase()}`}</button>
              </div>
            ) : null}
          </div>
        </div>
    </Dialog>
  )
}
