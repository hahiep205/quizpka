import { AlertTriangle, X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { pdfQuotaCopy as copy } from "@/shared/i18n"
import { cn, modalBodyClass, modalFooterClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"

type Lang = "en" | "vi"

/**
 * Modal toggle mới: báo user đã dùng hết 10 lượt tải PDF trong ngày.
 */
export function DownloadLimitModal({
  open,
  lang = "vi",
  onClose,
}: {
  open: boolean
  lang?: Lang
  onClose: () => void
}) {
  const t = copy[lang]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.title}
      closeLabel={t.close}
      className="z-[115]"
      panelClassName={cn("max-w-[400px] rounded-[18px] border-2 border-[#E5E5E5] bg-white shadow-[0_6px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none", modalFrameClass)}
    >
      <div className={modalHeaderClass}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-amber-50 text-amber-500 dark:bg-amber-500/10">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <h2 className="lp-modal-title text-[18px] sm:text-[20px]">{t.title}</h2>
        </div>
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label={t.close}>
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className={cn(modalBodyClass, "space-y-2.5")}>
        <p className="text-center text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{t.message}</p>
      </div>

      <div className={cn(modalFooterClass, "justify-center")}>
        <button
          type="button"
          className="lp-btn lp-btn--primary lp-btn--sm min-w-[140px] justify-center"
          onClick={onClose}
        >
          {t.action}
        </button>
      </div>
    </Dialog>
  )
}
