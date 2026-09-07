import { Bell, Check, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/features/notifications/useNotifications"

export function NotificationCenter({ lang }: { lang: "vi" | "en" }) {
  const [open, setOpen] = useState(false)
  const { page, unreadCount: unread, mutationError, error, mutating, markRead, markAllRead, loadMore, refresh } = useNotifications(open ? "all" : undefined)
  const label = lang === "vi" ? "Thông báo" : "Notifications"
  const closeLabel = lang === "vi" ? "Đóng" : "Close"
  const markAllLabel = lang === "vi" ? "Đánh dấu tất cả đã đọc" : "Mark all read"
  const read = (id?: number) => {
    void (id === undefined ? markAllRead() : markRead(id)).catch(() => { /* Rendered through shared mutationError below. */ })
  }
  return <div className="relative">
    <button type="button" aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition-[transform,background-color] duration-150 hover:bg-[#E4E6EB] active:scale-95 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]">
      <Bell className="h-5 w-5" strokeWidth={2} />
      {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-5 text-white ring-2 ring-slate-50 dark:ring-slate-950">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <>
      <button type="button" aria-label={closeLabel} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <section aria-label={label} className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10"><h2 className="font-extrabold">{label}</h2><div className="flex gap-1">{unread > 0 && <button type="button" disabled={mutating} onClick={() => read()} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={markAllLabel} aria-label={markAllLabel}><Check className="h-4 w-4" /></button>}<button type="button" aria-label={closeLabel} onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div></header>
        <div className="max-h-80 overflow-y-auto" aria-busy={page.loading}>
          {mutationError || page.error || error ? <div role="alert" className="p-4 text-sm text-red-500"><p>{mutationError ?? page.error ?? error}</p><button type="button" className="mt-2 underline" onClick={() => void refresh()}>{lang === "vi" ? "Thử tải lại" : "Retry loading"}</button></div> : null}
          {!page.loading && !page.error && !page.items.length ? <p className="p-6 text-center text-sm text-slate-500">{lang === "vi" ? "Chưa có thông báo" : "No notifications"}</p> : null}
          {page.items.map((item) => <button type="button" key={item.id} disabled={mutating || Boolean(item.readAt)} onClick={() => read(item.id)} className={cn("block w-full border-b border-slate-100 px-4 py-3 text-left dark:border-white/10", !item.readAt && "bg-primary-50 dark:bg-primary-950/30")}><p className="break-words text-sm font-bold">{item.title}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">{item.message}</p></button>)}
          {page.loading ? <p className="p-4 text-center text-sm text-slate-500">{lang === "vi" ? "Đang tải…" : "Loading…"}</p> : null}
          {page.hasMore ? <button type="button" disabled={page.loading || mutating} className="w-full p-3 text-sm font-bold text-sky-500" onClick={() => void loadMore()}>{lang === "vi" ? "Xem thêm" : "Load more"}</button> : null}
        </div>
      </section>
    </>}
  </div>
}
