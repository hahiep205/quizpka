import { useEffect, useId, useState } from "react"
import { BookOpen } from "lucide-react"
import { dsaiExamOptions } from "@/data/dsaiExams"
import type { ExamCatalogItem, Subject } from "@/data/subjects"
import { getExamTitle } from "@/data/subjects"
import { dsaiPickerCopy as copy } from "@/shared/i18n"
import { PickerModalShell, PickerOptionButton } from "@/components/PickerModalShell"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  exam: ExamCatalogItem | null
  subject: Subject | null
  onClose: () => void
  onSelect: (examId: string) => void
}

export function DsaiPickerModal({ open, lang, exam, subject, onClose, onSelect }: Props) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [selected, setSelected] = useState<string>(dsaiExamOptions[0].id)
  const t = copy[lang]

  useEffect(() => {
    if (open && exam) {
      setSelected(dsaiExamOptions[0].id)
      setVisible(true)
      setState("open")
      return
    }
    if (!visible) return
    setState("closed")
    const timer = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(timer)
  }, [open, exam, visible])

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

  if (!visible || !exam || !subject) return null

  return (
    <PickerModalShell
      titleId={titleId}
      title={t.title}
      subtitle={`${getExamTitle(exam, lang)} · ${t.subtitle}`}
      closeLabel={t.close}
      state={state}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>{t.cancel}</button>
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => onSelect(selected)}>{t.continue}</button>
        </>
      }
    >
      <div className="grid gap-3">
        {dsaiExamOptions.map((opt) => (
          <PickerOptionButton
            key={opt.id}
            active={selected === opt.id}
            icon={<BookOpen className="h-5 w-5" />}
            title={opt.title[lang]}
            subtitle={`${opt.questionCount} ${t.questions}`}
            onClick={() => setSelected(opt.id)}
          />
        ))}
      </div>
    </PickerModalShell>
  )
}
