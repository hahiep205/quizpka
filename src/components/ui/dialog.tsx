import { useEffect, useId, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
  className?: string
  panelClassName?: string
}

export function Dialog({ open, onClose, title, closeLabel, children, className, panelClassName }: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab" || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus(), 0)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
      previousFocus.current?.focus()
    }
  }, [onClose, open])

  if (!open) return null
  // Portal to document.body: an ancestor with a CSS transform (e.g.
  // .dashboard-reveal keeps translateY(0) after its animation) would
  // otherwise become the containing block of this fixed overlay and trap
  // the modal inside that section.
  return createPortal(
    <div className={cn("fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4", className)}>
      <button type="button" aria-label={closeLabel} className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("contact-modal-panel relative z-10 m-auto", panelClassName)}>
        <span id={titleId} className="sr-only">{title}</span>
        {children}
      </div>
    </div>,
    document.body
  )
}
