import { useEffect, useId, useRef, useState } from "react"
import { BookOpen, CirclePlay, Download, ExternalLink, FileImage, FileText, Volume2 } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
import { getChapterOptionsForSubject } from "@/data/subjectChapters"
import { tadvExamOptions } from "@/data/tadvExams"
import { dsaiExamOptions } from "@/data/dsaiExams"
import type { ExamCatalogItem, Subject } from "@/data/subjects"
import { getExamTitle } from "@/data/subjects"
import { chapterPickerCopy, dsaiPickerCopy, tadvPickerCopy } from "@/shared/i18n"
import { PickerModalShell, PickerOptionButton } from "@/components/PickerModalShell"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  exam: ExamCatalogItem | null
  subject: Subject | null
  onClose: () => void
  onConfirm: (chapterId: string) => void
}

// Same overlay/panel as "Bắt đầu học" (PickerModalShell: fixed inset-0 z-[90] + contact-modal-overlay bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px] + lp-modal-frame)
// but footer primary is "Tải về" (not "Bắt đầu") for /dashboard/downloads
export function DownloadPickerModal({ open, lang, exam, subject, onClose, onConfirm }: Props) {
  const titleId = useId()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [selected, setSelected] = useState<string>("all")
  const loggedExamRef = useRef<string | null>(null)

  const isTadv = exam?.subjectId === "tieng-anh-dau-vao"
  const isDsai = exam?.subjectId === "khoa-hoc-du-lieu-va-tri-tue-nhan-tao" || exam?.subjectId === "nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao"

  const tChapter = chapterPickerCopy[lang]
  const tTadv = tadvPickerCopy[lang]
  const tDsai = dsaiPickerCopy[lang]

  useEffect(() => {
    if (open && exam) {
      if (isTadv) setSelected(tadvExamOptions[0]?.id ?? "english-placement-reference-4")
      else if (isDsai) setSelected(dsaiExamOptions[0]?.id ?? "")
      else {
        const opts = (getChapterOptionsForSubject(exam.subjectId) ?? []).filter((o) => !o.hidden)
        setSelected(opts.some((o) => o.id === "all") ? "all" : (opts[0]?.id ?? "all"))
      }
      setVisible(true)
      setState("open")
      if (user?.id && loggedExamRef.current !== exam.id) {
        loggedExamRef.current = exam.id
        logActivityEvent(user.id, "view_exam_detail", { examId: exam.id, subjectId: exam.subjectId, intent: "download_pdf" })
      }
      return
    }
    loggedExamRef.current = null
    if (!visible) return
    setState("closed")
    const t = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(t)
  }, [exam, open, user?.id, visible, isTadv, isDsai])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!visible || !exam || !subject) return null

  // Branch like "Bắt đầu học" but footer = Tải về
  if (isTadv) {
    return (
      <PickerModalShell
        titleId={titleId}
        title={tTadv.title}
        subtitle={`${getExamTitle(exam, lang)} · ${tTadv.subtitle}`}
        closeLabel={tTadv.close}
        state={state}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>{tTadv.cancel}</button>
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => onConfirm(selected)}>
              <Download className="h-4 w-4" strokeWidth={2} />
              {lang === "vi" ? "Tải về" : "Download"}
            </button>
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
              subtitle={`${opt.questionCount ?? 50} ${tTadv.questions}`}
              onClick={() => setSelected(opt.id)}
            />
          ))}
        </div>
        {(() => {
          const tracks = tadvExamOptions.find((opt) => opt.id === selected)?.audioTracks ?? []
          if (!tracks.length) return null
          return (
            <div className="mt-4">
              <p className="lp-label mb-2">{lang === "vi" ? "File nghe kèm theo (MP3)" : "Included audio files (MP3)"}</p>
              <div className="grid gap-2">
                {tracks.map((track) => (
                  <a
                    key={track.url}
                    href={track.url}
                    download={track.fileName}
                    className="flex w-full items-center gap-4 rounded-[12px] border-2 border-[#E5E5E5] bg-white px-4 py-3 text-left transition-all hover:border-[#B3E5FC] dark:border-white/10 dark:bg-slate-900"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F6F7FB] text-[#1CB0F6] dark:bg-white/5">
                      <Volume2 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block line-clamp-2 text-[15px] font-extrabold leading-5 text-[#100F3E] dark:text-white">{track.label[lang]}</span>
                      <span className="mt-1 block text-[13px] font-semibold leading-4 text-slate-500 dark:text-slate-400">MP3 · {lang === "vi" ? "nhấn để tải về" : "tap to download"}</span>
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
                      <Download className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )
        })()}
      </PickerModalShell>
    )
  }

  if (isDsai) {
    return (
      <PickerModalShell
        titleId={titleId}
        title={tDsai.title}
        subtitle={`${getExamTitle(exam, lang)} · ${tDsai.subtitle}`}
        closeLabel={tDsai.close}
        state={state}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>{tDsai.cancel}</button>
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => onConfirm(selected)}>
              <Download className="h-4 w-4" strokeWidth={2} />
              {lang === "vi" ? "Tải về" : "Download"}
            </button>
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
              subtitle={`${opt.questionCount} ${tDsai.questions}`}
              onClick={() => setSelected(opt.id)}
            />
          ))}
        </div>
      </PickerModalShell>
    )
  }

  const rawOpts = (getChapterOptionsForSubject(subject.id) ?? []).filter((c) => !c.hidden)
  const chapterOptions = rawOpts.length
    ? rawOpts
    : [{ id: "all", label: { vi: "Toàn bộ", en: "All" } as const, count: exam.questionCount, documentId: undefined, pdfUrl: undefined, solutionUrl: undefined } as unknown as typeof rawOpts[number]]

  return (
    <PickerModalShell
      titleId={titleId}
      title={tChapter.title}
      subtitle={`${getExamTitle(exam, lang)} · ${tChapter.subtitle}`}
      closeLabel={tChapter.close}
      state={state}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>{tChapter.cancel}</button>
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => onConfirm(selected)}>
            <Download className="h-4 w-4" strokeWidth={2} />
            {lang === "vi" ? "Tải về" : "Download"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        {chapterOptions.map((chapter) => (
          <div key={chapter.id}>
            <PickerOptionButton
              active={selected === chapter.id}
              icon={chapter.documentId ? <FileImage className="h-5 w-5" /> : chapter.pdfUrl ? <FileText className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
              title={chapter.label[lang]}
              subtitle={chapter.documentId ? `${chapter.count} ${tChapter.images}` : chapter.pdfUrl ? (/\.pdf($|[?#])/i.test(chapter.pdfUrl) ? tChapter.pdf : tChapter.file) : `${chapter.count} ${tChapter.questions}`}
              onClick={() => setSelected(chapter.id)}
            />
            {chapter.solutionUrl ? (
              <a href={chapter.solutionUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 flex min-h-[95px] w-full items-center gap-4 rounded-[12px] border-2 border-red-300 bg-red-50 px-4 py-4 text-left transition-colors hover:bg-red-100 sm:min-h-0 dark:border-red-500/40 dark:bg-red-500/10 dark:hover:bg-red-500/15">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-red-500 text-white"><CirclePlay className="h-5 w-5" strokeWidth={2} /></span>
                <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-[15px] font-extrabold leading-5 text-red-600 dark:text-red-300">{lang === "vi" ? "Link giải đề của thầy Ngà" : "Solution video by Mr. Nga"}</span><span className="mt-1 block text-[13px] font-semibold leading-4 text-red-400 dark:text-red-400/80">{lang === "vi" ? "YouTube · mở trong tab mới" : "YouTube · opens in a new tab"}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-red-400 dark:text-red-400/70" strokeWidth={2} />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </PickerModalShell>
  )
}
