import { useEffect, useId, useState } from "react"
import { BookOpen, Clock3, FileText, Headphones } from "lucide-react"
import { getToeicScopeOptions, type ToeicScope } from "@/data/toeic"
import { toeicPickerCopy as copy } from "@/shared/i18n"
import { PickerModalShell, PickerOptionButton } from "@/components/PickerModalShell"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  examId: string
  onClose: () => void
  onSelect: (scope: ToeicScope) => void
}

function ScopeIcon({ scope }: { scope: ToeicScope }) {
  if (scope === "listening" || scope === "part1" || scope === "part2" || scope === "part3" || scope === "part4") {
    return <Headphones className="h-5 w-5" />
  }
  if (scope === "reading" || scope === "part5" || scope === "part6" || scope === "part7") {
    return <BookOpen className="h-5 w-5" />
  }
  return <FileText className="h-5 w-5" />
}

export function ToeicScopePickerModal({ open, lang, examId, onClose, onSelect }: Props) {
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

  const scopeOptions = getToeicScopeOptions(examId)
  const fullOpts = scopeOptions.filter((o) => o.id === "full")
  const skillOpts = scopeOptions.filter((o) => o.id === "listening" || o.id === "reading")
  const partOpts = scopeOptions.filter((o) => o.id.startsWith("part"))

  const renderGroup = (label: string, opts: typeof scopeOptions) => (
    <div className="space-y-3">
      <p className="lp-label px-1 text-slate-500 dark:text-slate-400">{label}</p>
      <div className="grid gap-3">
        {opts.map((opt) => (
          <PickerOptionButton
            key={opt.id}
            active={selected === opt.id}
            icon={<ScopeIcon scope={opt.id} />}
            title={opt.label[lang]}
            subtitle={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {opt.count} {t.questions}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {opt.durationMinutes} {t.minutes}
                </span>
              </span>
            }
            onClick={() => setSelected(opt.id)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <PickerModalShell
      titleId={titleId}
      title={t.title}
      subtitle={t.subtitle}
      closeLabel={t.close}
      state={state}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => onSelect(selected)}>
            {t.continue}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {renderGroup(t.groupFull, fullOpts)}
        {renderGroup(t.groupSkill, skillOpts)}
        {renderGroup(t.groupPart, partOpts)}
      </div>
    </PickerModalShell>
  )
}
