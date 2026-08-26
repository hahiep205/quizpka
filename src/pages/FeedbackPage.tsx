import { useEffect, useState } from "react"
import { MessageCircle, Send, Trash2, ArrowLeft, Mail, Clock3, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getFeedbacks, addFeedback, clearFeedbacks, seedDemoIfEmpty, type FeedbackItem } from "@/lib/feedbackStore"

type Lang = "en" | "vi"

const copy = {
  en: {
    title: "Feedback & Contributions",
    subtitle: "Admin view — displays both Document Contributions and general Feedback. Public, no login required, not linked in navigation.",
    formTitle: "Send feedback / contribution",
    typeLabel: "Type",
    typeContribute: "Document Contribution",
    typeFeedback: "Feedback",
    titleLabel: "Title",
    titlePlaceholderContribute: "Example: Contribution for practice set",
    titlePlaceholderFeedback: "Example: Feedback on TOEIC Part 7 interface",
    contentLabel: "Content",
    contentPlaceholderContribute: "Describe your document contribution...",
    contentPlaceholderFeedback: "Share your feedback on TOEIC practice to help us improve...",
    emailLabel: "Reply email",
    emailPlaceholder: "you@example.com",
    submit: "Send",
    cancel: "Clear",
    success: "Sent! It appears below.",
    listTitle: "All submissions",
    filterAll: "All",
    filterContribute: "Contributions",
    filterFeedback: "Feedback",
    empty: "No submissions yet.",
    clearAll: "Clear all (local)",
    back: "Back to home",
    count: "item(s)",
    justNow: "just now",
  },
  vi: {
    title: "Góp ý & Đóng góp",
    subtitle: "Trang dành cho admin — lưu và hiển thị cả Đóng góp tài liệu và Góp ý (chung, không chỉ TOEIC). Công khai, không cần đăng nhập, không hiển thị trong navigation.",
    formTitle: "Gửi góp ý / đóng góp",
    typeLabel: "Loại",
    typeContribute: "Đóng góp tài liệu",
    typeFeedback: "Góp ý",
    titleLabel: "Tiêu đề",
    titlePlaceholderContribute: "Ví dụ: Góp ý tính năng luyện đề",
    titlePlaceholderFeedback: "Ví dụ: Góp ý về giao diện Part 7 / đề TOEIC",
    contentLabel: "Nội dung",
    contentPlaceholderContribute: "Mô tả đóng góp tài liệu của bạn...",
    contentPlaceholderFeedback: "Nhập góp ý của bạn về Luyện thi TOEIC để chúng mình cải thiện...",
    emailLabel: "Mail nhận phản hồi",
    emailPlaceholder: "you@example.com",
    submit: "Gửi",
    cancel: "Xóa",
    success: "Đã gửi! Hiển thị bên dưới.",
    listTitle: "Tất cả",
    filterAll: "Tất cả",
    filterContribute: "Đóng góp",
    filterFeedback: "Góp ý",
    empty: "Chưa có dữ liệu. Hãy là người đầu tiên gửi!",
    clearAll: "Xóa tất cả (local)",
    back: "Về trang chủ",
    count: "mục",
    justNow: "vừa xong",
  },
} as const

function formatTime(iso: string, lang: Lang) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return copy[lang].justNow
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    return d.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}

export function FeedbackPage({ lang = "vi", onBack }: { lang?: Lang; onBack?: () => void }) {
  const t = copy[lang]
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState(false)
  const [filter, setFilter] = useState<"all" | "Contribute" | "Support">("all")
  const [formType, setFormType] = useState<"Contribute" | "Support">("Support")

  const refresh = () => setFeedbacks(getFeedbacks())

  useEffect(() => {
    seedDemoIfEmpty()
    refresh()
    const onUpdate = () => refresh()
    window.addEventListener("quizpka-feedbacks-updated", onUpdate)
    window.addEventListener("storage", onUpdate)
    return () => {
      window.removeEventListener("quizpka-feedbacks-updated", onUpdate)
      window.removeEventListener("storage", onUpdate)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !email.trim()) return
    addFeedback({
      title: title.trim(),
      content: content.trim(),
      email: email.trim(),
      type: formType,
      lang,
    })
    setTitle("")
    setContent("")
    setEmail("")
    setSuccess(true)
    refresh()
    window.setTimeout(() => setSuccess(false), 3000)
  }

  const filtered = feedbacks.filter((fb) => {
    if (filter === "all") return true
    // map legacy "Feedback" to "Support" (Góp ý)
    const normalizedType = fb.type === "Feedback" ? "Support" : fb.type
    return normalizedType === filter
  })
  const countContribute = feedbacks.filter((fb) => (fb.type === "Contribute" ? true : false)).length
  const countFeedback = feedbacks.filter((fb) => fb.type !== "Contribute").length

  const handleClear = () => {
    if (!confirm(lang === "vi" ? "Xóa tất cả góp ý local?" : "Clear all local feedback?")) return
    clearFeedbacks()
    refresh()
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-6 py-8 lg:px-8">
      <button type="button" onClick={onBack ?? (() => (window.location.href = "/"))} className="lp-btn lp-btn--secondary lp-btn--sm mb-6 inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t.back}
      </button>

      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F7FE] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#129BDC] dark:bg-sky-500/15 dark:text-sky-300">
          <Sparkles className="h-3.5 w-3.5" /> TOEIC Feedback
        </span>
        <h1 className="lp-section-heading mt-3 text-[28px] sm:text-[32px]">{t.title}</h1>
        <p className="lp-modal-desc mx-auto mt-2 max-w-[640px] text-[14px] leading-6">{t.subtitle}</p>
        <p className="mt-2 text-[12px] font-bold text-slate-400">{feedbacks.length} {t.count} • {lang === "vi" ? "Công khai, không cần đăng nhập" : "Public, no login required"}</p>
      </div>

      <Card variant="large" padding="lg" className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#1CB0F6] text-white">
            <MessageCircle className="h-5 w-5" />
          </span>
          <h2 className="lp-modal-title text-[18px]">{t.formTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb-type" className="lp-label">{t.typeLabel}</Label>
            <select
              id="fb-type"
              value={formType}
              onChange={(e) => setFormType(e.target.value as "Contribute" | "Support")}
              className="w-full rounded-[12px] border-2 border-[#E5E5E5] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#100F3E] focus:border-[#1CB0F6] focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <option value="Support">{t.typeFeedback}</option>
              <option value="Contribute">{t.typeContribute}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-title" className="lp-label">{t.titleLabel}</Label>
            <Input
              id="fb-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={formType === "Contribute" ? t.titlePlaceholderContribute : t.titlePlaceholderFeedback}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-content" className="lp-label">{t.contentLabel}</Label>
            <Textarea
              id="fb-content"
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={formType === "Contribute" ? t.contentPlaceholderContribute : t.contentPlaceholderFeedback}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-email" className="lp-label">{t.emailLabel}</Label>
            <Input id="fb-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
          </div>
          {success ? <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[13px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{t.success}</p> : null}
          <div className="flex gap-3 pt-1">
            <button type="submit" className="lp-btn lp-btn--primary lp-btn--sm flex-1 justify-center">
              <Send className="h-4 w-4" /> {t.submit}
            </button>
            <button type="button" onClick={() => { setTitle(""); setContent(""); setEmail("")}} className="lp-btn lp-btn--secondary lp-btn--sm">
              {t.cancel}
            </button>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="lp-label text-[12px] uppercase tracking-wide">{t.listTitle} • {filtered.length}/{feedbacks.length}</h3>
        {feedbacks.length > 0 ? (
          <button type="button" onClick={handleClear} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" /> {t.clearAll}
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter("all")} className={`rounded-full border-2 px-3 py-1.5 text-[12px] font-extrabold ${filter === "all" ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : "border-[#E5E5E5] bg-white text-[#777777] dark:border-white/10 dark:bg-white/5"}`}>
          {t.filterAll} ({feedbacks.length})
        </button>
        <button type="button" onClick={() => setFilter("Contribute")} className={`rounded-full border-2 px-3 py-1.5 text-[12px] font-extrabold ${filter === "Contribute" ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : "border-[#E5E5E5] bg-white text-[#777777] dark:border-white/10 dark:bg-white/5"}`}>
          {t.filterContribute} ({countContribute})
        </button>
        <button type="button" onClick={() => setFilter("Support")} className={`rounded-full border-2 px-3 py-1.5 text-[12px] font-extrabold ${filter === "Support" ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : "border-[#E5E5E5] bg-white text-[#777777] dark:border-white/10 dark:bg-white/5"}`}>
          {t.filterFeedback} ({countFeedback})
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {filtered.length === 0 ? (
          <Card padding="md" className="py-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="lp-modal-desc mt-3">{t.empty}</p>
          </Card>
        ) : (
          filtered.map((fb) => (
            <Card key={fb.id} padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-[15px] font-extrabold leading-6 text-[#100F3E] dark:text-white">{fb.title}</h4>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${fb.type === "Contribute" ? "bg-[#FFF8E1] text-[#9A7B00] dark:bg-[#FFD000]/15 dark:text-[#FFD000]" : "bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/15 dark:text-sky-300"}`}>
                  {fb.type === "Contribute" ? t.typeContribute : t.typeFeedback}
                </span>
              </div>
              <p className="whitespace-pre-line text-[13px] leading-6 text-[#4B4B4B] dark:text-slate-200">{fb.content}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-slate-400 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {fb.email}</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {formatTime(fb.createdAt, lang)}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
