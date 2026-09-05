import { Bell, Check, X } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/auth/AuthProvider"

type Notification = { id: string; title: string; message: string; createdAt: string; read: boolean }
const seed: Notification[] = [{ id: "welcome-v2", title: "Chào mừng đến với Quizpka!", message: "Chào mừng bạn đến với Quizpka - Trang làm quiz ôn thi dành riêng cho sinh viên Phenikaa!", createdAt: new Date().toISOString(), read: false }]

function load(key: string): Notification[] { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return Array.isArray(value) ? value.filter((item: Notification) => item.id !== "welcome") : seed } catch { return seed } }

export function NotificationCenter({ lang }: { lang: "vi" | "en" }) {
  const { user } = useAuth()
  const key = `quizpka-notifications:${user?.id ?? "anonymous"}`
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>(() => load(key))
  const unread = items.filter((item) => !item.read).length
  useEffect(() => { setItems(load(key)) }, [key])
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* Storage is optional. */ } }, [items, key])
  useEffect(() => { const refresh = () => setItems(load(key)); window.addEventListener("quizpka-notification-created", refresh); return () => window.removeEventListener("quizpka-notification-created", refresh) }, [key])
  const markAll = () => setItems((current) => current.map((item) => ({ ...item, read: true })))
  return <div className="relative">
    <button type="button" aria-label={lang === "vi" ? "Thông báo" : "Notifications"} title={lang === "vi" ? "Thông báo" : "Notifications"} onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition-[transform,background-color] duration-150 hover:bg-[#E4E6EB] active:scale-95 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]">
      <Bell className="h-5 w-5" strokeWidth={2} />
      {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-5 text-white ring-2 ring-slate-50 dark:ring-slate-950">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <><button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} /><section className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10"><h2 className="font-extrabold">{lang === "vi" ? "Thông báo" : "Notifications"}</h2><div className="flex gap-1">{unread > 0 && <button onClick={markAll} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={lang === "vi" ? "Đánh dấu đã đọc" : "Mark all read"}><Check className="h-4 w-4" /></button>}<button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div></header><div className="max-h-80 overflow-y-auto">{items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">{lang === "vi" ? "Chưa có thông báo" : "No notifications"}</p> : items.map((item) => <button key={item.id} onClick={() => setItems((current) => current.map((value) => value.id === item.id ? { ...value, read: true } : value))} className={cn("block w-full border-b border-slate-100 px-4 py-3 text-left dark:border-white/10", !item.read && "bg-primary-50 dark:bg-primary-950/30")}><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.message}</p></button>)}</div></section></>}
  </div>
}
