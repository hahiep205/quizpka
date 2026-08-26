import { useEffect, useId, useState } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { contactCopy as copy } from "@/shared/i18n"

export type ContactModalType = "Contribute" | "Support"

type ContactModalProps = {
  open: boolean
  type: ContactModalType | null
  onClose: () => void
  lang?: "en" | "vi"
}

export function ContactModal({ open, type, onClose, lang = "vi" }: ContactModalProps) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const t = copy[lang]

  useEffect(() => {
    if (open) {
      setVisible(true)
      setState("open")
      return
    }
    if (!visible) return
    setState("closed")
    const timer = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(timer)
  }, [open, visible])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!visible || !type) return null

  const heading = type === "Contribute" ? t.contributeTitle : t.supportTitle

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t.closeModal}
        data-state={state}
        className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      <Card
        variant="large"
        padding="none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        className="contact-modal-panel relative z-10 flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden shadow-[var(--shadow-3)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
          <h2 id={titleId} className="lp-modal-title text-[17px]">
            {heading}
          </h2>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon h-8 w-8" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F6F7FB] p-3 dark:bg-slate-900 sm:p-3.5">
          <div className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white shadow-[0_2px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900">
            {type === "Contribute" ? (
              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSfiFx_2AR4a9CKnbTmFXhNYugz1hg9kZJvpVzsh4KQZC94IeA/viewform?embedded=true"
                width="640"
                height="821"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                className="h-[600px] w-full sm:h-[650px]"
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
                className="h-[520px] w-full sm:h-[520px]"
                loading="lazy"
                title={lang === "vi" ? "Google Form Góp ý" : "Feedback Google Form"}
              >
                Đang tải…
              </iframe>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
