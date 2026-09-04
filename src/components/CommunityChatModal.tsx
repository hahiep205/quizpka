import { useEffect, useId, useState } from "react"
import { MessageCircle, Send, Sparkles, Users, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn, modalBodyClass, modalFooterClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"
import { communityChatCopy as copy } from "@/shared/i18n"

// Mock online count for design preview (real-time chat not wired yet)
const MOCK_ONLINE_COUNT = 128

type CommunityChatModalProps = {
  open: boolean
  onClose: () => void
  lang?: "en" | "vi"
}

const mockMessages = [
  {
    id: "1",
    nickname: "J976677028",
    initial: "J",
    color: "bg-[#1CB0F6]",
    time: "2 phút trước",
    timeEn: "2 min ago",
    content: "Ai có cấu trúc đề Tiếng anh đầu vào không cho mình xin với? 🙏",
    contentEn: "Ai có cấu trúc đề Tiếng anh đầu vào không cho mình xin với? 🙏",
    isOwn: false,
  },
  {
    id: "2",
    nickname: "Bạn",
    initial: "B",
    color: "bg-emerald-500",
    time: "1 phút trước",
    timeEn: "1 min ago",
    content: "Có bạn nhé, đề tham khảo TADV đã được ghim ở đầu mục Tài liệu.",
    contentEn: "Có bạn nhé, đề tham khảo TADV đã được ghim ở đầu mục Tài liệu.",
    isOwn: true,
  },
  {
    id: "3",
    nickname: "Meowisthebest",
    initial: "M",
    color: "bg-violet-500",
    time: "Vừa xong",
    timeEn: "Just now",
    content: "Meowwwwwwwwwww... ❤️",
    contentEn: "Meowwwwwwwwwww... ❤️",
    isOwn: false,
  },
]

export function CommunityChatModal({ open, onClose, lang = "vi" }: CommunityChatModalProps) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<"open" | "closed">("closed")
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
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        aria-label={t.closeModal}
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
        className={cn("contact-modal-panel relative z-10 m-auto max-w-[480px] rounded-[16px] shadow-[var(--shadow-3)] sm:max-w-[520px] lg:max-w-[560px]", modalFrameClass)}
      >
        {/* Header - đồng bộ ContactModal/Landing */}
        <div className={modalHeaderClass}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1CB0F6] text-white shadow-[0_3px_0_#189CD8] sm:inline-flex">
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="lp-modal-title flex items-center gap-2 text-[18px] sm:text-[20px]">
                <MessageCircle className="h-5 w-5 shrink-0 text-[#1CB0F6] sm:hidden" strokeWidth={2} />
                {t.title}
                <span className="hidden items-center gap-1 rounded-full border border-[#B3E5FC] bg-[#E8F7FE] px-2 py-0.5 text-[11px] font-extrabold leading-none tracking-wide text-[#129BDC] dark:border-sky-500/20 dark:bg-sky-500/10 sm:inline-flex">
                  <Sparkles className="h-3 w-3" strokeWidth={2} />
                  {t.beta}
                </span>
              </h2>
              <p className="lp-modal-desc mt-1 line-clamp-2 text-[13px] leading-5">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="lp-btn lp-btn--secondary lp-btn--icon shrink-0"
            onClick={onClose}
            aria-label={t.close}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Channel + Online bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-[#F6F7FB] px-5 py-3 dark:border-white/5 dark:bg-white/[0.03] sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[12px] font-extrabold leading-none text-[#100F3E] shadow-[0_1px_0_#E5E5E5] dark:bg-slate-800 dark:text-white dark:shadow-none border border-slate-200 dark:border-white/10">
              # {t.channelGeneral}
            </span>
            <span className="hidden text-[12px] font-semibold text-slate-400 dark:text-slate-500 sm:inline">
              {t.comingSoon}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold leading-none text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <Users className="h-3 w-3" strokeWidth={2} />
            {MOCK_ONLINE_COUNT} {t.online.toLowerCase()}
          </span>
        </div>

        {/* Messages area - mock để design đồng bộ */}
        <div className={cn(modalBodyClass, "bg-white dark:bg-slate-900")}>
          {/* Coming soon banner - style giống instruction box trong QuizSession */}
          <div className="mb-4 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3 dark:border-sky-500/20 dark:bg-sky-500/10">
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold leading-5 text-[#129BDC]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              {t.comingSoon}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-[#4B4B4B] dark:text-slate-300">{t.comingSoonDesc}</p>
          </div>

          <div className="space-y-3">
            {mockMessages.map((m) => (
              <div key={m.id} className={m.isOwn ? "flex justify-end" : "flex justify-start"}>
                <div className={`flex max-w-[82%] gap-2 ${m.isOwn ? "flex-row-reverse" : ""}`}>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white shadow-sm ${m.color}`}
                  >
                    {m.initial}
                  </span>
                  <div className={m.isOwn ? "items-end" : "items-start"}>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-extrabold leading-none text-[#100F3E] dark:text-white">
                        {m.nickname}
                      </span>
                      <span className="text-[11px] font-semibold leading-none text-slate-400 dark:text-slate-500">
                        {lang === "vi" ? m.time : m.timeEn}
                      </span>
                    </div>
                    <div
                      className={
                        m.isOwn
                          ? "mt-1 rounded-[14px] rounded-br-[4px] bg-[#1CB0F6] px-3.5 py-2.5 text-[13px] font-semibold leading-5 text-white shadow-[0_2px_0_#189CD8]"
                          : "mt-1 rounded-[14px] rounded-bl-[4px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-3.5 py-2.5 text-[13px] font-semibold leading-5 text-[#4B4B4B] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      }
                    >
                      {lang === "vi" ? m.content : m.contentEn}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-[12px] font-semibold italic text-slate-400 dark:text-slate-500">
            — {t.empty} —
          </p>
        </div>

        {/* Input footer - đồng bộ lp-btn / Input */}
        <div className={cn(modalFooterClass, "bg-white dark:bg-slate-900 sm:flex-col sm:items-stretch")}>
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                disabled
                placeholder={t.placeholder}
                className="h-[44px] w-full rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 pr-3 text-[14px] font-semibold placeholder:text-slate-400 focus:border-[#B3E5FC] focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              disabled
              className="lp-btn lp-btn--primary lp-btn--sm shrink-0 !h-[44px] !min-w-[44px] !px-3 disabled:opacity-60 sm:!px-4"
              aria-label={t.send}
              title={t.comingSoon}
            >
              <Send className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">{t.send}</span>
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold leading-none text-slate-400 dark:text-slate-500">
            {lang === "vi" ? "Nhấn Enter để gửi • Shift+Enter xuống dòng" : "Enter to send • Shift+Enter for new line"}
          </p>
        </div>
      </Card>
    </div>
  )
}
