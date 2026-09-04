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
  onClose: () => void
}

/**
 * Full-responsive PDF viewer.
 * - Panel cao cố định theo dvh, body flex-1 (min-h-0) nên iframe/object
 *   luôn vừa khít phần còn lại, không bao giờ tràn kể cả màn lùn/ngang.
 * - Mobile là bottom-sheet gần full màn; desktop là dialog giữa màn.
 * - <object> có fallback sẵn cho trình duyệt không preview được PDF inline.
 */
export function PdfViewerModal({ open, lang, title, pdfUrl, onClose }: Props) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [loaded, setLoaded] = useState(false)
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
    setLoaded(false)
  }, [pdfUrl])

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

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4 lg:p-6">
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
          "contact-modal-panel relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden",
          "rounded-t-[20px] border-x-2 border-t-2 border-[#E5E5E5] bg-white",
          "sm:h-[min(860px,92dvh)] sm:max-w-[960px] sm:rounded-[20px] sm:border-b-2 sm:shadow-[0_6px_0_#DCDCDC]",
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
                {t.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overscroll-contain bg-slate-100 dark:bg-slate-950">
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
        </div>

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
      </div>
    </div>
  )
}
