import { useEffect, useId, useState } from "react"
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react"
import type { LocalizedText } from "@/data/subjects"
import { pdfViewerCopy as copy } from "@/shared/i18n"
import { cn } from "@/lib/utils"

type Lang = "en" | "vi"

type Props = {
  open: boolean
  lang: Lang
  title: LocalizedText | null
  pdfUrl: string | null
  noteUrl?: string | null
  onClose: () => void
}

/**
 * Full-responsive PDF viewer.
 * - Panel cao cố định theo dvh, body flex-1 (min-h-0) nên iframe/object
 *   luôn vừa khít phần còn lại, không bao giờ tràn kể cả màn lùn/ngang.
 * - Mobile là bottom-sheet gần full màn; desktop là dialog giữa màn.
 * - <object> có fallback sẵn cho trình duyệt không preview được PDF inline.
 */
export function PdfViewerModal({ open, lang, title, pdfUrl, noteUrl, onClose }: Props) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [loaded, setLoaded] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const t = copy[lang]
  const isPdf = /\.pdf($|[?#])/i.test(pdfUrl ?? "")

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
    setLoaded(false)
  }, [pdfUrl])

  useEffect(() => {
    if (!open || !noteUrl) {
      if (!noteUrl) setNote(null)
      return
    }
    const controller = new AbortController()
    fetch(noteUrl, { signal: controller.signal })
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((text) => {
        if (!controller.signal.aborted) setNote(text.trim() ? text : null)
      })
      .catch(() => {
        if (!controller.signal.aborted) setNote(null)
      })
    return () => controller.abort()
  }, [noteUrl, open])

  // Lưới an toàn: nếu trình duyệt không bắn onLoad (chặn preview/tải chậm),
  // tự ẩn spinner sau 12s để không che fallback bên dưới.
  useEffect(() => {
    if (!visible || !pdfUrl || loaded) return
    const timer = window.setTimeout(() => setLoaded(true), 12000)
    return () => window.clearTimeout(timer)
  }, [loaded, pdfUrl, visible])

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

  if (!visible || !title || !pdfUrl) return null

  let fileName = pdfUrl.split("/").pop() ?? pdfUrl
  try {
    fileName = decodeURIComponent(fileName)
  } catch {
    /* keep raw name */
  }

  return (
    <div className={cn("fixed inset-0 z-[90] flex justify-center overflow-y-auto", isPdf ? "items-end sm:items-center sm:p-4 lg:p-6" : "items-center p-4 sm:p-6 lg:p-6")}>
      <button
        type="button"
        aria-label={t.close}
        data-state={state}
        className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        className={cn(
          "contact-modal-panel relative z-10 flex w-full flex-col overflow-hidden",
          isPdf ? "h-[94dvh]" : "m-auto max-h-[calc(100dvh_-_2rem)]",
          isPdf ? "rounded-t-[20px] border-x-2 border-t-2" : "rounded-[20px] border-2",
          "border-[#E5E5E5] bg-white",
          isPdf ? "sm:h-[min(860px,92dvh)]" : "sm:max-h-[min(860px,92dvh)]",
          "sm:max-w-[960px] sm:rounded-[20px] sm:border-b-2 sm:shadow-[0_6px_0_#DCDCDC]",
          "dark:border-white/10 dark:bg-slate-900 dark:sm:shadow-none",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 sm:px-6 sm:py-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
              <FileText className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-[15px] font-extrabold text-[#100F3E] sm:text-lg dark:text-white">
                {title[lang]}
              </h2>
              <p className="hidden truncate text-xs font-semibold text-slate-400 sm:block dark:text-slate-500">
                {isPdf ? t.subtitle : t.fileSubtitle}
              </p>
            </div>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-100 dark:bg-slate-950">
          {isPdf ? (
            <>
              {!loaded ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1CB0F6]" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.loading}</p>
                </div>
              ) : null}
              <object
                key={pdfUrl}
                data={pdfUrl}
                type="application/pdf"
                title={title[lang]}
                onLoad={() => setLoaded(true)}
                className="absolute inset-0 h-full w-full border-0"
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-white p-8 text-center dark:bg-slate-900">
                  <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="max-w-sm text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                    {t.previewUnavailable}
                  </p>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="lp-btn lp-btn--primary lp-btn--sm">
                      <ExternalLink className="h-4 w-4" strokeWidth={2} />
                      {t.openNewTab}
                    </a>
                    <a href={pdfUrl} download className="lp-btn lp-btn--secondary lp-btn--sm">
                      <Download className="h-4 w-4" strokeWidth={2} />
                      {t.download}
                    </a>
                  </div>
                </div>
              </object>
            </>
          ) : (
            <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 p-4 sm:p-6">
              {note ? (
                <div className="rounded-[14px] border-2 border-[#E5E5E5] bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-900 sm:px-5">
                  <p className="lp-label mb-2">{t.notes}</p>
                  <p className="whitespace-pre-line text-[14px] font-semibold leading-7 text-[#100F3E] dark:text-slate-100">{note}</p>
                </div>
              ) : null}
              <div className="flex items-center gap-3 rounded-[14px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-4 dark:border-sky-500/20 dark:bg-sky-500/10 sm:px-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#1CB0F6] text-white">
                  <FileText className="h-5 w-5" strokeWidth={2} />
                </span>
                <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-[#100F3E] dark:text-white">{fileName}</p>
                <a href={pdfUrl} download className="lp-btn lp-btn--primary lp-btn--sm shrink-0">
                  <Download className="h-4 w-4" strokeWidth={2} />
                  {t.downloadFile}
                </a>
              </div>
            </div>
          )}
        </div>

        {isPdf ? (
          <div className="flex shrink-0 flex-col gap-2 border-t border-[#E5E5E5] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:py-4 dark:border-white/10 dark:bg-slate-900">
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="lp-btn lp-btn--secondary lp-btn--sm flex-1 sm:flex-none">
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
              {t.openNewTab}
            </a>
            <a href={pdfUrl} download className="lp-btn lp-btn--secondary lp-btn--sm flex-1 sm:flex-none">
              <Download className="h-4 w-4" strokeWidth={2} />
              {t.download}
            </a>
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm flex-1 sm:flex-none" onClick={onClose}>
              {t.close}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
