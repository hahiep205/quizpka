import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { contactCopy as copy } from "@/shared/i18n"
import { cn, modalBodyClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"
import { submitSupportReport } from "@/features/support/api/supportReports"

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
  const handleSubmit = () => {
    if (!subject.trim() || !description.trim()) {
      setResult("Vui lòng nhập tiêu đề và mô tả lỗi.")
      return
    }
    setSending(true)
    setResult(null)
    void submitSupportReport({ subject: subject.trim(), description: description.trim(), pageUrl: window.location.href })
      .then(() => { setResult("Đã ghi nhận báo lỗi. Cảm ơn bạn đã thông báo."); setSubject(""); setDescription("") })
      .catch((error: unknown) => setResult(error instanceof Error ? error.message : "Không thể gửi báo lỗi."))
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
            {type === "Report" ? (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />Mô tả càng cụ thể càng giúp chúng tôi xử lý nhanh hơn.</div>
                <label className="block text-sm font-black">Tiêu đề lỗi<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} placeholder="Ví dụ: Không mở được đề thi" className="mt-2 h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" /></label>
                <label className="block text-sm font-black">Mô tả lỗi<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={6} placeholder="Các bước đã thực hiện, thông báo lỗi..." className="mt-2 w-full resize-y rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" /></label>
                {result ? <p role="status" className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{result}</p> : null}
                <button type="button" disabled={sending} onClick={handleSubmit} className="lp-btn lp-btn--primary w-full">{sending ? "Đang gửi..." : "Gửi báo lỗi"}</button>
              </div>
            ) : type === "Contribute" ? (
              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSfiFx_2AR4a9CKnbTmFXhNYugz1hg9kZJvpVzsh4KQZC94IeA/viewform?embedded=true"
                width="640"
                height="821"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                className="h-full min-h-[280px] w-full sm:h-[650px]"
                loading="lazy"
                title={lang === "vi" ? "Google Form Chia sẻ tài liệu" : "Share Document Google Form"}
              >
                Đang tải…
              </iframe>
            ) : (
              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSfZ7CRB3tXOTpYl8jT5ZfFp8-qnc1meMGiTRguLwP1LVOACMQ/viewform?embedded=true"
                width="100%"
                height="520"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                className="h-full min-h-[280px] w-full sm:h-[520px]"
                loading="lazy"
                title={lang === "vi" ? "Google Form Góp ý" : "Feedback Google Form"}
              >
                Đang tải…
              </iframe>
            )}
          </div>
        </div>
    </Dialog>
  )
}
