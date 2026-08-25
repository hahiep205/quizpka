import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { contactCopy as copy } from "@/shared/i18n"

export type ContactModalType = "Contribute" | "Support"

type ContactModalProps = {
  open: boolean
  type: ContactModalType | null
  onClose: () => void
  lang?: "en" | "vi"
}

const initialForm = {
  title: "",
  content: "",
  email: "",
}



function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="block space-y-2">
      <Label htmlFor={htmlFor} className="lp-label">{label}</Label>
      {children}
    </div>
  )
}

export function ContactModal({ open, type, onClose, lang = "vi" }: ContactModalProps) {
  const titleId = useId()
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const t = copy[lang]

  useEffect(() => {
    if (open) {
      setVisible(true)
      setState("open")
      setSubmitted(false)
      setForm(initialForm)
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

  const heading =
    type === "Contribute" ? t.contributeTitle : t.supportTitle

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

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
        className="contact-modal-panel relative z-10 w-full max-w-[480px] overflow-hidden shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <h2
            id={titleId}
            className="lp-modal-title"
          >
            {heading}
          </h2>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {submitted ? (
          <div className="space-y-5 px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <h3 className="lp-card-title text-[18px]">
                {t.successTitle}
              </h3>
              <p className="lp-modal-desc mt-2">
                {t.successDesc}
              </p>
            </div>
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block" onClick={onClose}>
              {t.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
            <Field label={t.titleLabel} htmlFor="contact-title">
              <Input
                id="contact-title"
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={
                  type === "Contribute"
                    ? t.titlePlaceholderContribute
                    : t.titlePlaceholderSupport
                }
              />
            </Field>

            <Field label={t.contentLabel} htmlFor="contact-content">
              <Textarea
                id="contact-content"
                required
                rows={5}
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder={t.contentPlaceholder}
              />
            </Field>

            <Field label={t.emailLabel} htmlFor="contact-email">
              <Input
                id="contact-email"
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder={t.emailPlaceholder}
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>
                {t.cancel}
              </button>
              <button type="submit" className="lp-btn lp-btn--primary lp-btn--sm">{t.submit}</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
