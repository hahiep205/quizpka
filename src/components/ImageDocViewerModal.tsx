import { useCallback, useEffect, useId, useState } from "react"
import { Download, FileImage, Loader2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { LocalizedText } from "@/data/subjects"
import { imageDocViewerCopy as copy } from "@/shared/i18n"
import { cn } from "@/lib/utils"

type Lang = "en" | "vi"

type DocImage = { url: string; name: string }

type Props = {
  open: boolean
  lang: Lang
  title: LocalizedText | null
  subjectId: string | null
  documentId: string | null
  onClose: () => void
}

async function downloadUrl(url: string, name: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
  }
}

export function ImageDocViewerModal({ open, lang, title, subjectId, documentId, onClose }: Props) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
  const [images, setImages] = useState<DocImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
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
    if (!open || !subjectId || !documentId) return
    let cancelled = false
    setLoading(true)
    setError(false)
    setImages([])
    void supabase.functions
      .invoke("get-paid-document", { body: { subjectId, documentId } })
      .then(({ data, error: invokeError }) => {
        if (cancelled) return
        const rows = (data as { images?: DocImage[] } | null)?.images
        if (invokeError || !Array.isArray(rows) || !rows.length) {
          setError(true)
        } else {
          setImages(rows)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [documentId, open, subjectId])

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

  const downloadOne = useCallback(async (image: DocImage) => {
    setDownloading(image.url)
    try {
      await downloadUrl(image.url, image.name)
    } catch {
      window.open(image.url, "_blank", "noopener")
    } finally {
      setDownloading(null)
    }
  }, [])

  const downloadAll = useCallback(async () => {
    for (const image of images) {
      await downloadOne(image)
    }
  }, [downloadOne, images])

  if (!visible || !title) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4">
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
          "contact-modal-panel relative z-10 m-auto flex max-h-[85vh] max-h-[85dvh] w-full min-h-0 max-w-[420px] flex-col overflow-hidden",
          "rounded-[20px] border-2 border-[#E5E5E5] bg-white",
          "sm:max-h-[min(860px,92dvh)] sm:max-w-[960px] sm:shadow-[0_6px_0_#DCDCDC]",
          "dark:border-white/10 dark:bg-slate-900 dark:sm:shadow-none",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 sm:px-6 sm:py-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
              <FileImage className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 id={titleId} className="truncate text-[15px] font-extrabold text-[#100F3E] sm:text-lg dark:text-white">
              {title[lang]}
            </h2>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-100 p-4 sm:p-6 dark:bg-slate-950">
          {loading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#1CB0F6]" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.loading}</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-sm text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{t.loadError}</p>
              <button
                type="button"
                className="lp-btn lp-btn--secondary lp-btn--sm"
                onClick={() => {
                  setError(false)
                  setLoading(true)
                  void supabase.functions
                    .invoke("get-paid-document", { body: { subjectId, documentId } })
                    .then(({ data, error: invokeError }) => {
                      const rows = (data as { images?: DocImage[] } | null)?.images
                      if (invokeError || !Array.isArray(rows) || !rows.length) setError(true)
                      else setImages(rows)
                    })
                    .catch(() => setError(true))
                    .finally(() => setLoading(false))
                }}
              >
                {t.retry}
              </button>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
              {images.map((image) => (
                <figure key={image.url} className="overflow-hidden rounded-[14px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
                  <img src={image.url} alt={image.name} loading="lazy" className="block h-auto w-full select-none" draggable={false} />
                  <figcaption className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5 dark:border-white/10">
                    <span className="min-w-0 truncate text-xs font-bold text-slate-500 dark:text-slate-400">{image.name}</span>
                    <button
                      type="button"
                      className="lp-btn lp-btn--secondary lp-btn--sm shrink-0"
                      disabled={downloading !== null}
                      onClick={() => void downloadOne(image)}
                    >
                      {downloading === image.url ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={2} />}
                      {t.download}
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && images.length ? (
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[#E5E5E5] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:py-4 dark:border-white/10 dark:bg-slate-900">
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm flex-1 sm:flex-none" disabled={downloading !== null} onClick={() => void downloadAll()}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={2} />}
              {t.downloadAll}
            </button>
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm flex-1 sm:flex-none" onClick={onClose}>
              {t.close}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
