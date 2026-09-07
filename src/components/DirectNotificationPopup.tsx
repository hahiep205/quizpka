import { Bell, Check, X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { useNotifications } from "@/features/notifications/useNotifications"

export function DirectNotificationPopup({ lang }: { lang: "vi" | "en" }) {
  const { direct: notification, dismissDirect, markRead, mutating, mutationError } = useNotifications()
  if (!notification) return null
  const closeLabel = lang === "vi" ? "Đóng thông báo" : "Close notification"
  const markReadAndClose = () => {
    void markRead(notification.id).catch(() => { /* Keep the popup open and render the shared error. */ })
  }
  return <Dialog open onClose={dismissDirect} title={notification.title} closeLabel={closeLabel} className="z-[100]" panelClassName="w-full max-w-md overflow-hidden rounded-[24px] border-2 border-white/80 bg-white shadow-[0_12px_40px_rgba(16,15,62,0.2)] dark:border-white/10 dark:bg-slate-900">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0"><div className="absolute inset-0 bg-gradient-to-br from-[#E8F7FE] via-white to-[#FFF8E1] dark:from-sky-500/10 dark:via-slate-900 dark:to-amber-500/10" /><div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#1CB0F6]/10 blur-2xl dark:bg-sky-500/20" /><div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#FFD000]/15 blur-2xl dark:bg-amber-500/15" /></div>
    <div className="relative max-h-[85svh] overflow-y-auto p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1CB0F6] text-white shadow-[0_4px_0_#0786C2]"><Bell className="h-6 w-6" /></div><button type="button" onClick={dismissDirect} className="rounded-xl p-2 text-slate-400 hover:bg-white/70 dark:hover:bg-white/10" aria-label={closeLabel}><X className="h-5 w-5" /></button></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#129BDC]">{lang === "vi" ? "Thông báo dành riêng cho bạn" : "Personal notification"}</p>
      <h2 className="mt-2 break-words text-2xl font-black leading-tight text-[#100F3E] dark:text-white">{notification.title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{notification.message}</p>
      {mutationError ? <p role="alert" className="mt-4 text-sm font-bold text-red-500">{mutationError}</p> : null}
      <div className="mt-6 flex justify-end"><button type="button" disabled={mutating} onClick={markReadAndClose} className="lp-btn lp-btn--primary"><Check className="h-4 w-4" />{mutating ? (lang === "vi" ? "Đang lưu…" : "Saving…") : (lang === "vi" ? "Đã hiểu" : "Got it")}</button></div>
    </div>
  </Dialog>
}
