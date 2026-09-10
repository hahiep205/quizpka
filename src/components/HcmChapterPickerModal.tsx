import { useEffect, useId, useRef, useState } from "react"
import { BookOpen, FileImage, FileText } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
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
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [selected, setSelected] = useState<string>("all")
  const loggedExamRef = useRef<string | null>(null)
  const t = copy[lang]

  useEffect(() => {
    if (open && exam) {
      const options = (getChapterOptionsForSubject(exam.subjectId) ?? []).filter((option) => !option.hidden)
      setSelected(options.some((option) => option.id === "all") ? "all" : (options[0]?.id ?? "all"))
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

  const chapterOptions = (getChapterOptionsForSubject(subject.id) ?? []).filter((chapter) => !chapter.hidden)

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
            icon={chapter.documentId ? <FileImage className="h-5 w-5" /> : chapter.pdfUrl ? <FileText className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            title={chapter.label[lang]}
            subtitle={chapter.documentId ? `${chapter.count} ${t.images}` : chapter.pdfUrl ? (/\.pdf($|[?#])/i.test(chapter.pdfUrl) ? t.pdf : t.file) : `${chapter.count} ${t.questions}`}
            onClick={() => setSelected(chapter.id)}
          />
        ))}
      </div>
      {chapterOptions.find((chapter) => chapter.id === selected)?.solutionUrl ? (
        <a
          href={chapterOptions.find((chapter) => chapter.id === selected)?.solutionUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-red-100 bg-red-50 px-3 py-2.5 text-[13px] font-extrabold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
        >
          {lang === "vi" ? "Link giải đề của thầy Ngà (YouTube)" : "Solution video by Mr. Nga (YouTube)"}
        </a>
      ) : null}
    </PickerModalShell>
  )
}
