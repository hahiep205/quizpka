import { X } from "lucide-react"
import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn, modalBodyClass, modalFooterClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"

export function PickerModalShell({
  titleId,
  title,
  subtitle,
  closeLabel,
  state,
  onClose,
  children,
  footer,
}: {
  titleId: string
  title: string
  subtitle: string
  closeLabel: string
  state: "open" | "closed"
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label={closeLabel}
        data-state={state}
        className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <Card
        variant="large"
        padding="none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        className={cn("contact-modal-panel relative z-10 m-auto max-w-[560px] shadow-[var(--shadow-3)]", modalFrameClass)}
      >
        <div className={modalHeaderClass}>
          <div>
            <h2 id={titleId} className="lp-modal-title">{title}</h2>
            <p className="lp-modal-desc-spaced">{subtitle}</p>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={closeLabel}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className={modalBodyClass}>
          {children}
        </div>
        <div className={modalFooterClass}>
          {footer}
        </div>
      </Card>
    </div>
  )
}

export function PickerOptionButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  title: string
  subtitle: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[95px] items-center gap-4 rounded-[12px] border-2 px-4 py-4 text-left transition-all sm:min-h-0",
        active
          ? "border-[#1CB0F6] bg-[#E8F7FE] shadow-[0_3px_0_#1CB0F6] dark:bg-sky-500/10"
          : "border-[#E5E5E5] bg-white hover:border-[#B3E5FC] dark:border-white/10 dark:bg-slate-900"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]",
          active ? "bg-[#1CB0F6] text-white" : "bg-[#F6F7FB] text-[#1CB0F6] dark:bg-white/5"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 text-[15px] font-extrabold leading-5 text-[#100F3E] dark:text-white">{title}</span>
        <span className="mt-1 block text-[13px] font-semibold leading-4 text-slate-500 dark:text-slate-400">{subtitle}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : "border-[#E5E5E5] bg-white dark:border-white/10"
        )}
      >
        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
    </button>
  )
}

