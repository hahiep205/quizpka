import { useEffect, useId, useState } from "react"
import { Download, FileText, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { LocalizedText } from "@/data/subjects"
import { pdfViewerCopy as copy } from "@/shared/i18n"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  title: LocalizedText | null
  pdfUrl: string | null
  onClose: () => void
}

export function PdfViewerModal({ open, lang, title, pdfUrl, onClose }: Props) {
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
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!visible || !title || !pdfUrl) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t.close}
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
        className="contact-modal-panel relative z-10 flex max-h-[min(900px,94vh)] w-full max-w-[960px] flex-col overflow-hidden shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] px-6 py-5 dark:border-white/10">
          <div className="min-w-0">
            <h2 id={titleId} className="lp-modal-title flex items-center gap-2">
              <FileText className="h-5 w-5 shrink-0 text-[#1CB0F6]" strokeWidth={2} />
              <span className="truncate">{title[lang]}</span>
            </h2>
            <p className="lp-modal-desc-spaced">{t.subtitle}</p>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
          <iframe key={pdfUrl} src={pdfUrl} title={title[lang]} className="h-[72vh] w-full border-0" />
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-[#E5E5E5] px-6 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="lp-btn lp-btn--secondary lp-btn--sm">
            <Download className="h-4 w-4" strokeWidth={2} />
            {t.download}
          </a>
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </Card>
    </div>
  )
}
