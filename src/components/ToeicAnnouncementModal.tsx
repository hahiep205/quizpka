import { useEffect, useState } from "react"
import { Check, FileUp, MessageCircle, Sparkles, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { GradientBackground } from "@/components/ui/gradient-background"
import { toeicAnnouncementCopy as copy } from "@/shared/i18n"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  onClose: () => void
  onDontShowToday: () => void
  onShare: () => void
  onFeedback: () => void
}

export function ToeicAnnouncementModal({ open, lang, onClose, onDontShowToday, onShare, onFeedback }: Props) {
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

  if (!visible) return null

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
        data-state={state}
        className="contact-modal-panel relative z-10 w-full max-w-[480px] overflow-hidden shadow-[var(--shadow-3)]"
      >
        <GradientBackground />

        <div className="relative px-6 pb-5 pt-6 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#1CB0F6] text-white shadow-[0_3px_0_#189CD8]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pr-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F7FE] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#129BDC] dark:bg-sky-500/15 dark:text-sky-300">
                <Sparkles className="h-3 w-3" /> {t.badge}
              </span>
              <h2 className="lp-modal-title mt-2 text-[20px] leading-6 sm:text-[22px]">{t.title}</h2>
              <p className="lp-modal-desc mt-2 text-[14px] leading-6">{t.desc}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {t.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-[#100F3E] dark:text-slate-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/15 dark:text-sky-300">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative px-6 pb-6 pt-2 sm:px-7">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onShare}
              className="lp-btn lp-btn--primary lp-btn--sm min-w-0 justify-center whitespace-normal text-center leading-4"
            >
              <FileUp className="h-4 w-4 shrink-0" />
              {t.share}
            </button>
            <button
              type="button"
              onClick={onFeedback}
              className="lp-btn lp-btn--secondary lp-btn--sm min-w-0 justify-center whitespace-normal text-center leading-4"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {t.feedback}
            </button>
          </div>
          <button
            type="button"
            onClick={onDontShowToday}
            className="mx-auto mt-4 block text-center text-[12px] font-bold text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t.dontShowToday}
          </button>
        </div>
      </Card>
    </div>
  )
}
