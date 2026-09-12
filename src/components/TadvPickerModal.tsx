import { useEffect, useId, useRef, useState } from "react"
import { BookOpen } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
import { tadvExamOptions } from "@/data/tadvExams"
import type { ExamCatalogItem, Subject } from "@/data/subjects"
import { getExamTitle } from "@/data/subjects"
import { tadvPickerCopy as copy } from "@/shared/i18n"
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

export function TadvPickerModal({ open, lang, exam, subject, onClose, onSelect }: Props) {
  const titleId = useId()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [selected, setSelected] = useState<string>(tadvExamOptions[0].id)
  const loggedExamRef = useRef<string | null>(null)
  const t = copy[lang]

  useEffect(() => {
    if (open && exam) {
      setSelected(tadvExamOptions[0].id)
      setVisible(true)
      setState("open")
      if (user?.id && loggedExamRef.current !== exam.id) {
        loggedExamRef.current = exam.id
        logActivityEvent(user.id, "view_exam_detail", { examId: exam.id, subjectId: exam.subjectId })
      }
      return
    }
    loggedExamRef.current = null
    if (!visible) return
    setState("closed")
    const timer = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(timer)
  }, [exam, open, user?.id, visible])

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
        {tadvExamOptions.map((opt) => (
          <PickerOptionButton
            key={opt.id}
            active={selected === opt.id}
            icon={<BookOpen className="h-5 w-5" />}
            title={opt.title[lang]}
            subtitle={`${opt.questionCount ?? 55} ${t.questions}`}
            onClick={() => setSelected(opt.id)}
          />
        ))}
      </div>
    </PickerModalShell>
  )
}
