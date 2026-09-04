import { useEffect, useId, useState } from "react"
import { BookOpen, FileText } from "lucide-react"
import { getChapterOptionsForSubject } from "@/data/subjectChapters"
import type { ExamCatalogItem, Subject } from "@/data/subjects"
import { getExamTitle } from "@/data/subjects"
import { chapterPickerCopy as copy } from "@/shared/i18n"
import { PickerModalShell, PickerOptionButton } from "@/components/PickerModalShell"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  exam: ExamCatalogItem | null
  subject: Subject | null
  onClose: () => void
  onSelect: (chapterId: string) => void
}

export function HcmChapterPickerModal({ open, lang, exam, subject, onClose, onSelect }: Props) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [selected, setSelected] = useState<string>("all")
  const t = copy[lang]

  useEffect(() => {
    if (open && exam) {
      const options = getChapterOptionsForSubject(exam.subjectId) ?? []
      setSelected(options.some((option) => option.id === "all") ? "all" : (options[0]?.id ?? "all"))
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

  const chapterOptions = getChapterOptionsForSubject(subject.id) ?? []

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
        {chapterOptions.map((chapter) => (
          <PickerOptionButton
            key={chapter.id}
            active={selected === chapter.id}
            icon={chapter.pdfUrl ? <FileText className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            title={chapter.label[lang]}
            subtitle={chapter.pdfUrl ? (/\.pdf($|[?#])/i.test(chapter.pdfUrl) ? t.pdf : t.file) : `${chapter.count} ${t.questions}`}
            onClick={() => setSelected(chapter.id)}
          />
        ))}
      </div>
    </PickerModalShell>
  )
}
