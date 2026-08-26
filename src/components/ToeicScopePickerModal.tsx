import { useEffect, useId, useState } from "react"
import { BookOpen, Clock3, FileText, Headphones, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toeicScopeOptions, type ToeicScope } from "@/data/toeic"
import { toeicPickerCopy as copy } from "@/shared/i18n"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  onClose: () => void
  onSelect: (scope: ToeicScope) => void
}

function ScopeIcon({ scope, active }: { scope: ToeicScope; active: boolean }) {
  const cls = cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]", active ? "bg-[#1CB0F6] text-white" : "bg-[#F6F7FB] text-[#1CB0F6] dark:bg-white/5")
  if (scope === "listening" || scope === "part1" || scope === "part2" || scope === "part3" || scope === "part4") {
    return (
      <span className={cls}>
        <Headphones className="h-5 w-5" />
      </span>
    )
  }
  if (scope === "reading" || scope === "part5" || scope === "part6" || scope === "part7") {
    return (
      <span className={cls}>
        <BookOpen className="h-5 w-5" />
      </span>
    )
  }
  return (
    <span className={cls}>
      <FileText className="h-5 w-5" />
    </span>
  )
}

export function ToeicScopePickerModal({ open, lang, onClose, onSelect }: Props) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [selected, setSelected] = useState<ToeicScope>("full")
  const t = copy[lang]

  useEffect(() => {
    if (open) {
      setSelected("full")
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

  const fullOpts = toeicScopeOptions.filter((o) => o.id === "full")
  const skillOpts = toeicScopeOptions.filter((o) => o.id === "listening" || o.id === "reading")
  const partOpts = toeicScopeOptions.filter((o) => o.id.startsWith("part"))

  const renderGroup = (label: string, opts: typeof toeicScopeOptions) => (
    <div className="space-y-3">
      <p className="lp-label px-1 text-slate-500 dark:text-slate-400">{label}</p>
      <div className="grid gap-3">
        {opts.map((opt) => {
          const active = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={cn(
                "flex items-center gap-4 rounded-[12px] border-2 px-4 py-4 text-left transition-all",
                active
                  ? "border-[#1CB0F6] bg-[#E8F7FE] shadow-[0_3px_0_#1CB0F6] dark:bg-sky-500/10"
                  : "border-[#E5E5E5] bg-white hover:border-[#B3E5FC] dark:border-white/10 dark:bg-slate-900"
              )}
            >
              <ScopeIcon scope={opt.id} active={active} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold leading-5 text-[#100F3E] dark:text-white">{opt.label[lang]}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {opt.count} {t.questions}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {opt.durationMinutes} {t.minutes}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : "border-[#E5E5E5] bg-white dark:border-white/10"
                )}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

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
        className="contact-modal-panel relative z-10 flex max-h-[min(760px,92vh)] w-full max-w-[560px] flex-col overflow-hidden shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] px-6 py-5 dark:border-white/10">
          <div>
            <h2 id={titleId} className="lp-modal-title">
              {t.title}
            </h2>
            <p className="lp-modal-desc-spaced">{t.subtitle}</p>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-6">
            {renderGroup(t.groupFull, fullOpts)}
            {renderGroup(t.groupSkill, skillOpts)}
            {renderGroup(t.groupPart, partOpts)}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E5E5E5] px-6 py-4 dark:border-white/10 sm:flex-row sm:justify-end">
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => onSelect(selected)}>
            {t.continue}
          </button>
        </div>
      </Card>
    </div>
  )
}
