import { useEffect, useId, useState } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { loginCopy as copy } from "@/shared/i18n"

type LoginModalProps = {
  open: boolean
  onClose: () => void
  lang?: "en" | "vi"
}



export function LoginModal({ open, onClose, lang = "vi" }: LoginModalProps) {
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

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
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
        className="contact-modal-panel relative z-10 w-full max-w-[440px] overflow-hidden shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <h2
            id={titleId}
            className="lp-modal-title"
          >
            {t.title}
          </h2>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="lp-modal-desc py-6 text-center text-[15px]">
            {t.note}
          </p>

          <div className="flex justify-end pt-1">
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>
              {t.cancel}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
