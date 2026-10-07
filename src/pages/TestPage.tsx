import { useEffect, useRef } from "react"
import {
  BarChart3,
  BookOpen,
  CreditCard,
  Download,
  History,
  Layers,
  LogIn,
  MousePointerClick,
  PencilLine,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import type { Language } from "@/shared/types/app"

type Lang = Language

const copy = {
  vi: {
    featuresSubtitle: "Các tính năng hỗ trợ bạn ôn tập nhanh chóng và theo dõi tiến trình học tập dễ dàng.",
    manualSubtitle: "Đăng nhập, chọn môn, cấu hình đề và bắt đầu làm Quiz - mọi thứ chỉ trong vài bước.",
    features: [
      { icon: "login", title: "Đăng nhập Google 1 chạm", desc: "Vào học ngay, không cần mật khẩu." },
      { icon: "modes", title: "3 chế độ làm bài", desc: "Luyện tập, thi thử và luyện câu khó." },
      { icon: "history", title: "Lưu lịch sử làm bài", desc: "Mọi lượt làm được giữ lại để xem bất cứ lúc nào." },
      { icon: "retry", title: "Làm lại câu sai", desc: "Tự động gom câu sai để luyện lại trọng tâm." },
      { icon: "trophy", title: "Bảng xếp hạng", desc: "Tích điểm học tập và so tài cùng mọi người." },
      { icon: "toeic", title: "Thi thử TADV", desc: "Thi thử tiếng Anh đầu vào theo cấu trúc đề thật của Phenikaa." },
      { icon: "paid", title: "Tài liệu đa dạng", desc: "Bao gồm nhiều tài liệu miễn phí và trả phí." },
      { icon: "pdf", title: "Tải PDF miễn phí", desc: "In đề ra giấy, gồm cả câu hỏi và đáp án." },
    ],
    steps: [
      { title: "Đăng nhập", desc: "Đăng nhập bằng Google để lưu toàn bộ tiến trình học." },
      { title: "Tìm tài liệu", desc: "Tìm môn theo từ khóa hoặc lọc trong danh sách đề." },
      { title: "Sử dụng tài liệu Quiz miễn phí hoặc mua tài liệu trả phí", desc: "Làm Quiz miễn phí ngay, hoặc quét QR để thanh toán và mở khóa tài liệu Quiz trả phí." },
      { title: "Cấu hình đề", desc: "Chọn chương, thứ tự câu hỏi, chế độ làm bài và thời gian." },
      { title: "Làm bài và xem kết quả", desc: "Trả lời từng câu, nộp bài để chấm điểm ngay." },
      { title: "Ôn lại và tải PDF", desc: "Xem lịch sử, làm lại câu sai, tải đề miễn phí về in." },
    ],
  },
  en: {
    featuresSubtitle: "Features that help you review quickly and track your study progress with ease.",
    manualSubtitle: "Sign in, pick subjects, configure quizzes and start - all in a few steps.",
    features: [
      { icon: "login", title: "1-tap Google sign-in", desc: "Start learning right away, no password needed." },
      { icon: "modes", title: "3 quiz modes", desc: "Practice, mock exam and hard drills." },
      { icon: "history", title: "Saved history", desc: "Every attempt is kept so you can review anytime." },
      { icon: "retry", title: "Retry wrong answers", desc: "Wrong questions are collected for focused practice." },
      { icon: "trophy", title: "Leaderboard", desc: "Earn learning points and compare with others." },
      { icon: "toeic", title: "TADV mock test", desc: "Placement English mock test following Phenikaa's real exam structure." },
      { icon: "paid", title: "Diverse materials", desc: "Includes plenty of free and paid materials." },
      { icon: "pdf", title: "Free PDF downloads", desc: "Print sets with questions and answers included." },
    ],
    steps: [
      { title: "Sign in", desc: "Sign in with Google to save your learning progress." },
      { title: "Find materials", desc: "Search subjects by keyword or filter the exam list." },
      { title: "Use free Quiz materials or buy paid ones", desc: "Take free quizzes right away, or scan QR to pay and unlock paid Quiz materials." },
      { title: "Configure the quiz", desc: "Choose chapters, question order, mode and time." },
      { title: "Take the quiz and view results", desc: "Answer each question, submit for instant scoring." },
      { title: "Review and download PDF", desc: "Check history, retry wrong answers, print free sets." },
    ],
  },
} as const

type FeatureIcon = (typeof copy)["vi"]["features"][number]["icon"]

const FEATURE_ICONS: Record<FeatureIcon, LucideIcon> = {
  login: LogIn,
  modes: Layers,
  history: History,
  retry: RotateCcw,
  trophy: Trophy,
  toeic: BookOpen,
  paid: CreditCard,
  pdf: Download,
}

const STEP_ICONS: LucideIcon[] = [
  LogIn,
  MousePointerClick,
  ShoppingBag,
  Settings2,
  PencilLine,
  BarChart3,
]

export function TestPage({ lang, responsiveTrial = false }: { lang: Lang; responsiveTrial?: boolean }) {
  const t = copy[lang]
  const frameRef = useRef<HTMLIFrameElement>(null)

  // Dark mode: ép nền body trong iframe thành #020617 (màu nền trang).
  useEffect(() => {
    const frame = frameRef.current
    const syncBg = () => {
      const doc = frame?.contentDocument
      const body = doc?.body
      if (!doc || !body) return
      const root = doc.documentElement
      root.style.margin = "0"
      root.style.padding = "0"
      root.style.border = "0"
      body.style.margin = "0"
      // Bỏ padding 16px của file gốc để SVG lấp khít khung, hết khe hở viền.
      body.style.padding = "0"
      body.style.border = "0"
      body.style.outline = "none"
      const svg = body.querySelector("svg")
      if (svg instanceof SVGSVGElement) {
        svg.style.display = "block"
        svg.style.verticalAlign = "top"
      }
      if (document.documentElement.classList.contains("dark")) {
        body.style.background = "#020617"
      } else {
        body.style.background = ""
      }
    }
    syncBg()
    frame?.addEventListener("load", syncBg)
    const timers = [window.setTimeout(syncBg, 500), window.setTimeout(syncBg, 2000)]
    const observer = new MutationObserver(syncBg)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => {
      observer.disconnect()
      frame?.removeEventListener("load", syncBg)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])
  return (
    <>
      {/* Thay vị trí #docs trang chủ: liệt kê chức năng (id riêng cho trang test). */}
      <section
        id="features"
        className={`mx-auto flex w-full max-w-[1120px] flex-col scroll-mt-28 border-t border-slate-200 ${responsiveTrial ? "px-[clamp(16px,2vw+10px,32px)]" : "px-[clamp(24px,2vw+16px,32px)]"} pb-[clamp(40px,2.5vw+30px,48px)] pt-[clamp(56px,4vw+40px,64px)] dark:border-white/10`}
      >
        <div className="py-4 pb-10 text-center sm:py-6 sm:pb-12">
          <h2 className="lp-section-heading">
            {lang === "vi" ? <><span className="name-logo">Quizpka</span> có những gì?</> : <>What does <span className="name-logo">Quizpka</span> offer?</>}
          </h2>
          <p className="lp-section-subheading mx-auto mt-0 text-center">
            {t.featuresSubtitle}
          </p>
        </div>

        <div className={`grid gap-4 ${responsiveTrial ? "grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-4" : "grid-cols-2 md:grid-cols-2 xl:grid-cols-4"}`}>
          {t.features.map((feature) => {
            const Icon = FEATURE_ICONS[feature.icon]
            return (
              <article
                key={feature.title}
                className="group flex h-full flex-col rounded-[15px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-3 text-[15px] font-black leading-6 text-[#100F3E] dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                  {feature.desc}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      {/* Thay vị trí #features trang chủ: hướng dẫn sử dụng (id riêng cho trang test). */}
      <section
        id="starts"
        className={`mx-auto flex w-full max-w-[1120px] flex-col scroll-mt-28 border-t border-slate-200 ${responsiveTrial ? "px-[clamp(16px,2vw+10px,32px)]" : "px-[clamp(24px,2vw+16px,32px)]"} pb-[clamp(40px,2.5vw+30px,48px)] pt-[clamp(56px,4vw+40px,64px)] dark:border-white/10`}
      >
        <div className="py-4 pb-10 text-center sm:py-6 sm:pb-12">
          <h2 className="lp-section-heading">
            {lang === "vi" ? <>Bắt đầu ôn tập với <span className="name-logo">Quizpka</span></> : <>Start practicing with <span className="name-logo">Quizpka</span></>}
          </h2>
          <p className="lp-section-subheading mx-auto mt-0 text-center">
            {t.manualSubtitle}
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="order-2 mx-auto w-full max-w-[347px] [clip-path:inset(2px_0_0_0)] sm:order-1 sm:max-w-[320px] lg:max-w-none">
            <iframe
              ref={frameRef}
              title=""
              aria-hidden="true"
              tabIndex={-1}
              scrolling="no"
              frameBorder="0"
              loading="lazy"
              src="/start-svg-2.html"
              className="mx-auto block aspect-[469/487] w-full overflow-hidden border-0 outline-none dark:bg-[#020617]"
            />
          </div>
          <ol className="relative order-1 w-full sm:order-2">
            <span
              aria-hidden="true"
              className="absolute bottom-8 left-[23px] top-8 w-[3px] rounded-full bg-gradient-to-b from-[#1CB0F6] via-[#7DD3FC] to-[#B3E5FC] dark:from-sky-500/60 dark:via-sky-500/25 dark:to-transparent"
            />
            {t.steps.map((step, index) => {
              const Icon = STEP_ICONS[index % STEP_ICONS.length] ?? MousePointerClick
              return (
                <li key={step.title} className="relative flex gap-4 pb-4 last:pb-0 sm:gap-5">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1CB0F6] text-lg font-black text-white shadow-[0_3px_0_#0786C2]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:p-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-black leading-6 text-[#100F3E] dark:text-white">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </>
  )
}
