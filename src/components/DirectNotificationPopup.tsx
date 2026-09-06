import { Bell, Check, X } from "lucide-react"
import { useEffect, useState } from "react"
import { fetchUnreadDirectNotification, markNotificationRead, type UserNotification } from "@/features/notifications/api/notifications"

export function DirectNotificationPopup({ lang }: { lang: "vi" | "en" }) {
  const [notification, setNotification] = useState<UserNotification | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void fetchUnreadDirectNotification().then((item) => {
        if (!cancelled && item) { setNotification(item); setOpen(true) }
      }).catch(() => undefined)
    }, 1000)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [])
  if (!open || !notification) return null
  const close = () => setOpen(false)
  const markReadAndClose = () => { void markNotificationRead(notification.id).finally(close) }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
    <button type="button" aria-label="Đóng thông báo" className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={close} />
    <section role="dialog" aria-modal="true" aria-labelledby="direct-notification-title" className="relative w-full max-w-md overflow-hidden rounded-[24px] border-2 border-white/80 bg-white shadow-[0_12px_40px_rgba(16,15,62,0.2)] dark:border-white/10 dark:bg-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0"><div className="absolute inset-0 bg-gradient-to-br from-[#E8F7FE] via-white to-[#FFF8E1] dark:from-sky-500/10 dark:via-slate-900 dark:to-amber-500/10" /><div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#1CB0F6]/10 blur-2xl dark:bg-sky-500/20" /><div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#FFD000]/15 blur-2xl dark:bg-amber-500/15" /></div>
      <div className="relative p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1CB0F6] text-white shadow-[0_4px_0_#0786C2]"><Bell className="h-6 w-6" /></div><button type="button" onClick={close} className="rounded-xl p-2 text-slate-400 hover:bg-white/70 dark:hover:bg-white/10" aria-label="Đóng"><X className="h-5 w-5" /></button></div><p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#129BDC]">{lang === "vi" ? "Thông báo dành riêng cho bạn" : "Personal notification"}</p><h2 id="direct-notification-title" className="mt-2 text-2xl font-black leading-tight text-[#100F3E] dark:text-white">{notification.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{notification.message}</p><div className="mt-6 flex justify-end"><button type="button" onClick={markReadAndClose} className="lp-btn lp-btn--primary"><Check className="h-4 w-4" />{lang === "vi" ? "Đã hiểu" : "Got it"}</button></div></div>
    </section>
  </div>
}
