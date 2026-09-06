import { useEffect, useMemo, useState, type ComponentType } from "react"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  History,
  Home,
  Languages,
  Moon,
  Search,
  Settings,
  ShoppingBag,
  Sun,
  Trophy,
  UserRound,
  LogOut,
  MessageCircle,
  X,
} from "lucide-react"
import brandLogo from "@/assets/logo.png"
import { QuizSetupModal, type QuizSetupValues } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { PdfViewerModal } from "@/components/PdfViewerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { DsaiPickerModal } from "@/components/DsaiPickerModal"
import { ToeicScopePickerModal } from "@/components/ToeicScopePickerModal"
import { getToeicScopeOption, type ToeicScope } from "@/data/toeic"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { cn, modalBodyClass, modalFooterClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"
import { dashboardCopy as copy } from "@/shared/i18n"
import { useExamLaunch } from "@/lib/useExamLaunch"
import type { Language, Theme } from "@/shared/types/app"
import { useAuth } from "@/auth/AuthProvider"
import { navigate as navigateApp, appRoutes, getCurrentPath, type AppPath } from "@/app/navigation"
import { readStorage, writeStorage } from "@/lib/storage"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
import { computeLearningStats, formatLearningDuration } from "@/lib/learningStats"
import { goToPractice, readPracticeHistory } from "@/lib/practiceSession"
import { useSubjectAttemptCounts } from "@/hooks/useSubjectAttemptCounts"
import { MobileTabBar } from "@/components/MobileTabBar"
import { CatalogExamCard } from "@/components/CatalogExamCard"
import { PaymentModal } from "@/components/PaymentModal"
import { DashboardStatCard, dashboardStatGridClass } from "@/components/DashboardStatCard"
import { LeaderboardView } from "@/components/LeaderboardView"
import { CommunityChatModal } from "@/components/CommunityChatModal"
import { NotificationCenter } from "@/components/NotificationCenter"
import { DirectNotificationPopup } from "@/components/DirectNotificationPopup"
import { formatTime } from "@/features/quiz/lib/quizHelpers"
import { createPaidCheckout, getPaidProductId, hasProductPurchase } from "@/lib/purchases"
import type { ContactModalType } from "@/components/ContactModal"

type Lang = Language
type DashboardView = "home" | "leaderboard" | "history" | "settings" | "purchased"

type DashboardPageProps = {
  lang: Lang
  theme: Theme
  onToggleLang: () => void
  onToggleTheme: () => void
  onOpenContact: (type: ContactModalType) => void
}

const navItems: Array<{
  key: DashboardView
  icon: ComponentType<{ className?: string }>
}> = [
  { key: "home", icon: SidebarHomeIcon },
  { key: "leaderboard", icon: SidebarRankingIcon },
  { key: "history", icon: SidebarHistoryIcon },
  { key: "purchased", icon: ShoppingBag },
  { key: "settings", icon: SidebarSettingsIcon },
]

function SidebarSvg({ className, children }: { className?: string; children: React.ReactNode }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}

function SidebarHomeIcon({ className }: { className?: string }) {
  return <SidebarSvg className={className}><path d="M20 20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V11H1L11.3273 1.6115C11.7087 1.26475 12.2913 1.26475 12.6727 1.6115L23 11H20V20ZM11 13V19H13V13H11Z" /></SidebarSvg>
}

function SidebarRankingIcon({ className }: { className?: string }) {
  return <SidebarSvg className={className}><path d="M12 7C16.4183 7 20 10.5817 20 15C20 19.4183 16.4183 23 12 23C7.58172 23 4 19.4183 4 15C4 10.5817 7.58172 7 12 7ZM12 10.5L10.6775 13.1797L7.72025 13.6094L9.86012 15.6953L9.35497 18.6406L12 17.25L14.645 18.6406L14.1399 15.6953L16.2798 13.6094L13.3225 13.1797L12 10.5ZM13 1.99902L18 2V5L16.6366 6.13758C15.5305 5.55773 14.3025 5.17887 13.0011 5.04951L13 1.99902ZM11 1.99902L10.9997 5.04943C9.6984 5.17866 8.47046 5.55738 7.36441 6.13706L6 5V2L11 1.99902Z" /></SidebarSvg>
}

function SidebarHistoryIcon({ className }: { className?: string }) {
  return <SidebarSvg className={className}><path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C7.52232 22 3.73057 19.056 2.45404 15H4.58152C5.76829 17.9318 8.64466 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C9.099 4 6.5585 5.54489 5.15596 7.85721L8 10H2V4L3.69098 5.26797C5.52247 3.27193 8.15393 2 12 2ZM13 7V11.5858L16.2426 14.8284L14.8284 16.2426L11 12.4142V7H13Z" /></SidebarSvg>
}

function SidebarSettingsIcon({ className }: { className?: string }) {
  return <SidebarSvg className={className}><path d="M12 1L14.09 3.26L17.14 2.82L18.5 5.59L21.27 6.95L20.83 10L23.09 12L20.83 14L21.27 17.05L18.5 18.41L17.14 21.18L14.09 20.74L12 23L9.91 20.74L6.86 21.18L5.5 18.41L2.73 17.05L3.17 14L.91 12L3.17 10L2.73 6.95L5.5 5.59L6.86 2.82L9.91 3.26L12 1ZM12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8ZM12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" /></SidebarSvg>
}

const mobileNavLabels = {
  vi: {
    home: "Trang chủ",
    leaderboard: "Xếp hạng",
    history: "Lịch sử",
    settings: "Cài đặt",
    purchased: "Đã mua",
  },
  en: {
    home: "Home",
    leaderboard: "Ranking",
    history: "History",
    settings: "Settings",
    purchased: "Purchased",
  },
} as const

const mobileNavIcons = {
  home: Home,
  leaderboard: Trophy,
  history: History,
  settings: Settings,
  purchased: ShoppingBag,
} as const

export function DashboardPage({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onOpenContact,
}: DashboardPageProps) {
  const [activeView, setActiveView] = useState<DashboardView>(() => getDashboardView(getCurrentPath()))
  const { user: dashboardUser, status: dashboardStatus } = useAuth()
  const [payment, setPayment] = useState<{ payment: { qrUrl: string } } | null>(null)
  const [paymentProductId, setPaymentProductId] = useState("dsai101")
  const handlePaidTryNow = async (exam: ExamCatalogItem) => {
    try {
    const productId = getPaidProductId(exam.subjectCode)
    if (!productId) return handleTryNow(exam)
    if (dashboardUser?.id && await hasProductPurchase(dashboardUser.id, productId)) return handleTryNow(exam)
    const result = await createPaidCheckout(productId)
    if (result.owned) return handleTryNow(exam)
    if (!result.payment) throw new Error("Chưa cấu hình thông tin tài khoản thanh toán")
    setPaymentProductId(productId)
    setPayment({ payment: result.payment })
    } catch (error) { window.alert(error instanceof Error ? error.message : "Không thể tạo thanh toán. Vui lòng thử lại.") }
  }

  useEffect(() => {
    logActivityEvent(dashboardUser?.id, "view_dashboard", {}, { oncePerSessionKey: `view_dashboard:${dashboardUser?.id ?? "anon"}` })
  }, [dashboardUser?.id, dashboardUser?.created_at])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "general" | "major" | "free" | "paid" | "toeic">("all")
  const [toeicPickerExam, setToeicPickerExam] = useState<ExamCatalogItem | null>(null)
  const [toeicScope, setToeicScope] = useState<ToeicScope>("full")
  const [toeicSetupOpen, setToeicSetupOpen] = useState(false)
  const {
    pickerExam: hcmPickerExam,
    setupExam,
    pickerSubject,
    setupSubject,
    handlePickerSelect,
    handlePickerClose,
    handlePdfClose,
    pdfChapter,
    handleSetupClose,
    handleSetupStart,
    tadvPickerExam,
    handleTryNow,
    handleTadvSelect,
    setTadvPickerExam,
    dsaiPickerExam,
    handleDsaiSelect,
    setDsaiPickerExam,
  } = useExamLaunch(lang)

  useEffect(() => {
    const syncView = () => setActiveView(getDashboardView(getCurrentPath()))
    window.addEventListener("popstate", syncView)
    return () => window.removeEventListener("popstate", syncView)
  }, [])

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(lang)
    return examCatalog.filter((exam) => {
      const isToeic = exam.subjectId === "toeic"
      if (filter === "toeic") {
        if (!isToeic) return false
      } else if (isToeic) {
        return false
      }
      const categoryKey = exam.category.en === "General" ? "general" : "major"
        const isPaid = exam.subjectCode === "DSAI101" || exam.subjectCode === "SQA101" || exam.subjectCode === "SEC301"
      const matchesFilter =
        filter === "all" || filter === "toeic"
          ? true
          : filter === "free"
            ? !isPaid
            : filter === "paid"
              ? isPaid
              : categoryKey === filter
      const haystack = `${exam.title[lang]} ${exam.subjectName[lang]} ${exam.subjectCode}`.toLocaleLowerCase(lang)
      return matchesFilter && (!normalized || haystack.includes(normalized))
    })
  }, [filter, lang, query])

  const navigate = (view: DashboardView) => {
    setActiveView(view)
    const paths: Record<DashboardView, AppPath> = {
      home: appRoutes.dashboard,
      leaderboard: appRoutes.dashboardLeaderboard,
      history: appRoutes.dashboardHistory,
      settings: appRoutes.dashboardSettings,
      purchased: appRoutes.dashboardPurchased,
    }
    navigateApp(paths[view])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDashboardStart = (exam: ExamCatalogItem) => {
    if (exam.subjectId === "toeic") {
      setToeicScope("full")
      setToeicSetupOpen(false)
      setToeicPickerExam(exam)
      return
    }
    void handlePaidTryNow(exam)
  }

  const handleToeicPickerSelect = (scope: ToeicScope) => {
    setToeicScope(scope)
    setToeicSetupOpen(true)
  }

  const toeicScopeOption = toeicPickerExam ? getToeicScopeOption(toeicScope, toeicPickerExam.id) : null
  const toeicSetupExam: ExamCatalogItem | null = toeicPickerExam
    ? {
        ...toeicPickerExam,
        questionCount: toeicScopeOption?.count ?? toeicPickerExam.questionCount,
        durationMinutes: toeicScopeOption?.durationMinutes ?? toeicPickerExam.durationMinutes,
        title: toeicScopeOption
          ? {
              en: `${toeicPickerExam.title.en} - ${toeicScopeOption.label.en}`,
              vi: `${toeicPickerExam.title.vi} - ${toeicScopeOption.label.vi}`,
            }
          : toeicPickerExam.title,
      }
    : null
  const toeicSetupSubject = toeicPickerExam ? getSubjectById(toeicPickerExam.subjectId) : null

  const handleToeicSetupStart = (setup: QuizSetupValues) => {
    if (!toeicPickerExam) return
    goToPractice(
      {
        examId: toeicPickerExam.id,
        subjectId: toeicPickerExam.subjectId,
        setup,
        lang,
        toeicScope,
      },
      dashboardStatus === "authenticated",
    )
  }

  return (
    <div className="min-h-svh bg-[#F6F7FB] text-[#100F3E] transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <DirectNotificationPopup lang={lang} />
      <DesktopSidebar activeView={activeView} lang={lang} onNavigate={navigate} />

      <div className="lg:pl-[200px]">
        <DashboardTopbar lang={lang} view={activeView} />

        <main className="mx-auto w-full max-w-[1440px] px-3 pb-[calc(108px+env(safe-area-inset-bottom))] pt-4 min-[380px]:px-4 sm:px-6 sm:pt-6 md:px-8 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
          {activeView === "home" ? (
            <HomeDashboard
              lang={lang}
              query={query}
              filter={filter}
              filteredExams={filteredExams}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onStartExam={handleDashboardStart}
            />
          ) : null}
          {activeView === "leaderboard" ? <LeaderboardView lang={lang} /> : null}
          {activeView === "history" ? <EmptyView lang={lang} view="history" /> : null}
          {activeView === "purchased" ? <PurchasedView lang={lang} onStartExam={(exam) => void handlePaidTryNow(exam)} /> : null}
          {activeView === "settings" ? (
            <SettingsView
              lang={lang}
              theme={theme}
              onToggleLang={onToggleLang}
              onToggleTheme={onToggleTheme}
              onOpenContact={onOpenContact}
            />
          ) : null}
        </main>
      </div>

      <MobileNav activeView={activeView} lang={lang} onNavigate={navigate} />

      <HcmChapterPickerModal
        open={Boolean(hcmPickerExam)}
        lang={lang}
        exam={hcmPickerExam}
        subject={pickerSubject}
        onClose={handlePickerClose}
        onSelect={handlePickerSelect}
      />

      <PdfViewerModal
        open={Boolean(pdfChapter)}
        lang={lang}
        title={pdfChapter?.title ?? null}
        pdfUrl={pdfChapter?.url ?? null}
        noteUrl={pdfChapter?.noteUrl ?? null}
        onClose={handlePdfClose}
      />

      <TadvPickerModal
        open={Boolean(tadvPickerExam)}
        lang={lang}
        exam={tadvPickerExam}
        subject={tadvPickerExam ? getSubjectById(tadvPickerExam.subjectId) : null}
        onClose={() => setTadvPickerExam(null)}
        onSelect={handleTadvSelect}
      />

      <DsaiPickerModal
        open={Boolean(dsaiPickerExam)}
        lang={lang}
        exam={dsaiPickerExam}
        subject={dsaiPickerExam ? getSubjectById(dsaiPickerExam.subjectId) : null}
        onClose={() => setDsaiPickerExam(null)}
        onSelect={handleDsaiSelect}
      />

      <QuizSetupModal
        open={Boolean(setupExam)}
        lang={lang}
        exam={setupExam}
        subject={setupSubject}
        onClose={handleSetupClose}
        onStart={handleSetupStart}
      />

      <PaymentModal
        open={Boolean(payment)}
        lang={lang}
        payment={payment?.payment ?? null}
        productId={paymentProductId}
        userId={dashboardUser?.id}
        onClose={() => setPayment(null)}
        onPaid={() => {
          setPayment(null)
          navigate("purchased")
        }}
      />

      <ToeicScopePickerModal
        open={Boolean(toeicPickerExam) && !toeicSetupOpen}
        lang={lang}
        examId={toeicPickerExam?.id ?? "toeic-test-01"}
        onClose={() => setToeicPickerExam(null)}
        onSelect={handleToeicPickerSelect}
      />

      <QuizSetupModal
        open={toeicSetupOpen && Boolean(toeicSetupExam)}
        lang={lang}
        exam={toeicSetupExam}
        subject={toeicSetupSubject}
        onClose={() => {
          setToeicSetupOpen(false)
          setToeicPickerExam(null)
        }}
        onStart={handleToeicSetupStart}
      />
    </div>
  )
}

function getDashboardView(path: string): DashboardView {
  if (path === appRoutes.dashboardLeaderboard) return "leaderboard"
  if (path === appRoutes.dashboardHistory) return "history"
  if (path === appRoutes.dashboardSettings) return "settings"
  if (path === appRoutes.dashboardPurchased) return "purchased"
  return "home"
}

function PurchasedView({ lang, onStartExam }: { lang: Lang; onStartExam: (exam: ExamCatalogItem) => void }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [ownedIds, setOwnedIds] = useState<string[]>([])
  const [error, setError] = useState(false)
  const purchasedExams = examCatalog.filter((exam) => exam.subjectCode === "DSAI101" || exam.subjectCode === "SQA101" || exam.subjectCode === "SEC301")

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setLoading(false)
      return
    }
    void Promise.all(purchasedExams.map(async (exam) => (await hasProductPurchase(user.id, getPaidProductId(exam.subjectCode) ?? "") ? exam.id : null)))
      .then((values) => { if (mounted) setOwnedIds(values.filter((value): value is string => value !== null)) })
      .catch(() => {
        if (mounted) setError(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [user?.id])

  return (
    <section className="space-y-5">
      {loading ? <Card variant="dashed" className="py-12 text-center"><p className="text-sm font-bold text-slate-500">{lang === "vi" ? "Đang kiểm tra giao dịch…" : "Checking purchases…"}</p></Card> : null}
      {!loading && error ? <Card variant="dashed" className="py-12 text-center"><p className="text-sm font-bold text-red-500">{lang === "vi" ? "Không thể tải danh sách tài liệu đã mua." : "Could not load purchased materials."}</p></Card> : null}
      {!loading && !error && ownedIds.length ? purchasedExams.filter((exam) => ownedIds.includes(exam.id)).map((purchasedExam) => (
        <article className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-[0_4px_0_rgba(16,185,129,0.12)] dark:border-emerald-500/20 dark:bg-slate-900 dark:shadow-none sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">{lang === "vi" ? "Đã thanh toán" : "Purchased"}</span>
              <h3 className="mt-3 text-xl font-black text-[#100F3E] dark:text-white">{purchasedExam.subjectName[lang]}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{purchasedExam.description[lang]}</p>
              <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{purchasedExam.questionCount} {lang === "vi" ? "câu hỏi" : "questions"} · {purchasedExam.durationMinutes} {lang === "vi" ? "phút" : "minutes"}</p>
            </div>
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm shrink-0" onClick={() => onStartExam(purchasedExam)}>{lang === "vi" ? "Ôn tập ngay" : "Practice now"}<ArrowRight className="h-4 w-4" /></button>
          </div>
        </article>
      )) : null}
      {!loading && !error && !ownedIds.length ? <Card variant="dashed" className="py-12 text-center"><ShoppingBag className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">{lang === "vi" ? "Bạn chưa mua tài liệu nào." : "You have not purchased any materials yet."}</p></Card> : null}
    </section>
  )
}

function DesktopSidebar({
  activeView,
  lang,
  onNavigate,
}: {
  activeView: DashboardView
  lang: Lang
  onNavigate: (view: DashboardView) => void
}) {
  const t = copy[lang]
  const { profile, signOut } = useAuth()
  const handleSignOut = () => { void signOut().then(() => navigateApp(appRoutes.home, { replace: true })) }
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[200px] border-r border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-slate-900 lg:flex lg:flex-col">
      <a href="/" className="flex h-12 items-center px-3" aria-label="QuizPKA">
        <img src={brandLogo} alt="QuizPKA" className="h-8 w-auto object-contain" />
      </a>

      <nav className="mt-7 flex flex-1 flex-col gap-1.5" aria-label="Dashboard">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={cn(
                "group flex w-full items-center gap-3.5 rounded-[var(--radius-sm)] px-[14px] py-[10px] text-left text-[12px] font-bold leading-5 text-[var(--gray-text)] transition-all duration-200",
                isActive
                  ? "bg-sky-50 text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300"
                  : "hover:bg-slate-50 hover:text-[#18181B] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon className="h-[19px] w-[19px]" />
              </span>
              <span className="sidebar-label font-bold">{t.nav[item.key]}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 pt-4 dark:border-white/10">
        <div className="mb-3 flex items-center gap-3 px-2">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-500/10"><UserRound className="h-4 w-4" /></div>}
          <div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{profile?.display_name ?? profile?.email}</p><p className="truncate text-[11px] font-semibold text-slate-400">{profile?.email}</p></div>
        </div>
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm lp-btn--block" onClick={handleSignOut}><LogOut className="h-4 w-4" />{lang === "vi" ? "Đăng xuất" : "Sign out"}</button>
      </div>
    </aside>
  )
}

function DashboardTopbar({ lang, view }: Pick<DashboardPageProps, "lang"> & { view: DashboardView }) {
  const t = copy[lang]
  const [chatOpen, setChatOpen] = useState(false)
  const topbarTitle =
    view === "leaderboard"
      ? t.leaderboardTitle
      : view === "history"
        ? t.historyTitle
        : view === "settings"
          ? t.settingsTitle
          : view === "purchased"
            ? t.purchasedTitle
            : lang === "vi" ? "Quiz dành cho PKAers" : "Quiz for PKAers"
  const chatLabel = lang === "vi" ? "Chat cộng đồng" : "Community Chat"
  const pageMeta =
    view === "leaderboard"
      ? { icon: Trophy, title: t.leaderboardTitle }
      : view === "history"
        ? { icon: History, title: t.historyTitle }
        : view === "settings"
          ? { icon: Settings, title: t.settingsTitle }
          : view === "purchased"
            ? { icon: ShoppingBag, title: lang === "vi" ? "Quiz đã mua" : "Purchased quizzes" }
            : null
  const PageIcon = pageMeta?.icon
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-2xl dark:bg-[#18191A]/80">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-3 sm:h-16 sm:px-6 md:px-8 lg:h-[72px] lg:px-8 xl:px-10">
          {pageMeta && PageIcon ? (
            view === "leaderboard" ? (
              <a href="/" className="flex items-center text-[27px] lg:hidden" aria-label={pageMeta.title}>
                <span className="name-logo">{pageMeta.title}</span>
              </a>
            ) : view === "history" ? (
              <a href="/" className="flex items-center text-[27px] lg:hidden" aria-label={lang === "vi" ? "Lịch sử làm quiz" : pageMeta.title}>
                <span className="name-logo">{lang === "vi" ? "Lịch sử làm quiz" : pageMeta.title}</span>
              </a>
            ) : view === "purchased" ? (
              <a href="/" className="flex items-center text-[27px] lg:hidden" aria-label={pageMeta.title}>
                <span className="name-logo">{pageMeta.title}</span>
              </a>
            ) : view === "settings" ? (
              <a href="/" className="flex items-center text-[27px] lg:hidden" aria-label={pageMeta.title}>
                <span className="name-logo">{pageMeta.title}</span>
              </a>
            ) : (
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] sm:h-14 sm:w-14 sm:rounded-[16px] dark:bg-sky-500/10">
                  <PageIcon className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <h2 className="truncate text-[22px] font-black leading-7 tracking-[-0.03em] text-[#100F3E] sm:text-[28px] dark:text-white">
                  {pageMeta.title}
                </h2>
              </div>
            )
          ) : (
            <a href="/" className="flex items-center text-[27px] lg:hidden" aria-label="Quiz for PKAers">
              <span className="name-logo">Quiz for PKAers</span>
            </a>
          )}

          <a href="/" className="hidden min-w-0 flex-1 sm:block" aria-label={topbarTitle}>
            <h2 className="truncate bg-gradient-to-r from-[#7DD3FC] via-[#1CB0F6] to-[#0A4FD6] bg-clip-text text-2xl font-black tracking-[-0.025em] text-transparent sm:text-[32px] lg:text-[36px]">{topbarTitle}</h2>
          </a>

          <div className="ml-auto">
            <div className="flex items-center gap-2">
            <TopbarButton label={chatLabel} onClick={() => setChatOpen(true)}>
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
            </TopbarButton>
            <NotificationCenter lang={lang} />
            </div>
          </div>
        </div>
      </header>
      <CommunityChatModal open={chatOpen} onClose={() => setChatOpen(false)} lang={lang} />
    </>
  )
}

function TopbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition-[transform,background-color] duration-150 hover:bg-[#E4E6EB] active:scale-95 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]"
    >
      {children}
    </button>
  )
}

function LearningStatsGrid({ lang, className }: { lang: Lang; className?: string }) {
  const t = copy[lang]
  const { user } = useAuth()
  const userId = user?.id
  const userCreatedAt = user?.created_at
  const history = useMemo(() => userId ? readPracticeHistory(userId, userCreatedAt) : [], [userCreatedAt, userId])
  const stats = useMemo(() => computeLearningStats(history, "all"), [history])

  return (
    <section className={cn(dashboardStatGridClass, className)} aria-label="Statistics">
      <DashboardStatCard icon={Flame} value={String(stats.subjectsReviewed)} label={t.streak} tone="orange" />
      <DashboardStatCard icon={CheckCircle2} value={String(stats.attempts)} label={t.completed} tone="green" />
      <DashboardStatCard icon={BarChart3} value={`${stats.averageAccuracy}%`} label={t.accuracy} tone="blue" />
      <DashboardStatCard icon={Clock3} value={formatLearningDuration(stats.totalDurationSeconds)} label={t.studyTime} tone="violet" />
    </section>
  )
}

function HomeDashboard({
  lang,
  query,
  filter,
  filteredExams,
  onQueryChange,
  onFilterChange,
  onStartExam,
}: {
  lang: Lang
  query: string
  filter: "all" | "general" | "major" | "free" | "paid" | "toeic"
  filteredExams: ExamCatalogItem[]
  onQueryChange: (value: string) => void
  onFilterChange: (value: "all" | "general" | "major" | "free" | "paid" | "toeic") => void
  onStartExam: (exam: ExamCatalogItem) => void
}) {
  const t = copy[lang]
  const attemptCountsBySubject = useSubjectAttemptCounts()

  return (
    <div className="space-y-6 dashboard-reveal sm:space-y-8">
      <LearningStatsGrid lang={lang} className="hidden sm:grid" />

      <section id="dashboard-documents" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block sm:min-w-0 sm:flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t.search}
                className="h-11 w-full rounded-[12px] border-2 border-[#E5E5E5] bg-white pl-10 pr-3 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none transition focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]"
              />
            </label>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:grid-cols-none sm:grid-flow-col">
              {(["all", "general", "major", "free", "paid", "toeic"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onFilterChange(item)}
                  className={cn("lp-chip min-h-10 min-w-0 justify-center whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm", filter === item && "is-active")}
                >
                  {t[item]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredExams.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredExams.map((exam) => (
              <CatalogExamCard
                key={exam.id}
                exam={exam}
                lang={lang}
                attemptCount={attemptCountsBySubject[exam.subjectId] ?? 0}
                categoryLabel={exam.subjectId === "toeic" ? "TOEIC" : exam.category.en === "General" ? t.general : t.major}
                questionsLabel={t.questions}
                footer={
                  <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-3 px-2 text-[12px] sm:mt-5 sm:px-4 sm:text-sm" onClick={() => onStartExam(exam)}>
                    {exam.subjectCode === "DSAI101" || exam.subjectCode === "SQA101" || exam.subjectCode === "SEC301" ? "10.000 VND" : t.start}
                    <ArrowRight className="hidden h-4 w-4 sm:inline" />
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <Card variant="dashed" className="py-14 text-center">
            <FileText className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">{t.empty}</p>
          </Card>
        )}
      </section>

    </div>
  )
}

function EmptyView({ lang, view }: { lang: Lang; view: "history" }) {
  const t = copy[lang]
  const { user } = useAuth()
  const userId = user?.id
  const userCreatedAt = user?.created_at
  const [history, setHistory] = useState(() => userId ? readPracticeHistory(userId, userCreatedAt) : [])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [wrongListItemId, setWrongListItemId] = useState<string | null>(null)
  const wrongListItem = history.find((item) => item.id === wrongListItemId)

  useEffect(() => {
    setHistory(userId ? readPracticeHistory(userId, userCreatedAt) : [])
    setExpandedId(null)
    setWrongListItemId(null)
  }, [userCreatedAt, userId])

  const retryWrong = (item: (typeof history)[number]) => {
    const ids = item.wrongQuestions?.map((question) => question.id) ?? []
    if (!ids.length) return
    goToPractice({
      examId: item.examId,
      subjectId: item.subjectId,
      setup: { ...item.setup, mode: "practice" },
      lang: item.lang,
      chapterId: item.chapterId,
      toeicScope: item.toeicScope,
      questionIds: ids,
      retryOfHistoryId: item.retryOfHistoryId ?? item.id,
      retryNumber: (item.retryNumber ?? 0) + 1,
    }, true)
  }
  return (
    <section className="dashboard-reveal mx-auto max-w-4xl">
      <LearningStatsGrid lang={lang} className="mb-4 sm:hidden" />
      {history.length ? (
        <div className="space-y-3">
          {history.map((item) => (
            <HistoryAttemptCard
              key={item.id}
              item={item}
              lang={lang}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onShowWrong={() => setWrongListItemId(item.id)}
              onRetry={() => retryWrong(item)}
            />
          ))}
        </div>
      ) : <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
          {view === "history" ? <CalendarDays className="h-8 w-8" /> : null}
        </div>
        <p className="mt-5 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{t.activityEmpty}</p>
      </div>}
      <WrongAnswersDialog
        item={wrongListItem}
        lang={lang}
        onClose={() => setWrongListItemId(null)}
        onRetry={() => {
          if (wrongListItem) retryWrong(wrongListItem)
        }}
      />
    </section>
  )
}

type HistoryItem = ReturnType<typeof readPracticeHistory>[number]

function HistoryAttemptCard({ item, lang, expanded, onToggle, onShowWrong, onRetry }: {
  item: HistoryItem
  lang: Lang
  expanded: boolean
  onToggle: () => void
  onShowWrong: () => void
  onRetry: () => void
}) {
  const wrong = item.wrongQuestions ?? []
  return (
    <article className="overflow-hidden rounded-[15px] border-2 border-slate-200 bg-white shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:rounded-[16px]">
      <button type="button" className="flex w-full items-start justify-between gap-3 p-3.5 text-left sm:items-center sm:gap-4 sm:p-4" onClick={onToggle} aria-expanded={expanded}>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-extrabold leading-5 text-[#100F3E] dark:text-white sm:text-base">{item.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
            <span>{new Date(item.completedAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")} · {item.mode}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black text-[#1CB0F6] sm:text-base">{item.score.toFixed(1)}/10</p>
          {item.retryNumber ? <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-[#E8F7FE] px-2 py-1 text-[10px] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300 sm:text-xs">{lang === "vi" ? `Làm lại lần ${item.retryNumber}` : `Retry ${item.retryNumber}`}</span> : null}
        </div>
      </button>
      {expanded ? <div className="border-t border-slate-100 p-3.5 dark:border-white/10 sm:p-4">
        <div className="grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4 sm:gap-3">
          <HistoryMetric label={lang === "vi" ? "Đúng" : "Correct"} value={String(item.correct)} />
          <HistoryMetric label={lang === "vi" ? "Sai / chưa làm" : "Wrong / skipped"} value={String(wrong.length)} />
          <HistoryMetric label={lang === "vi" ? "Độ chính xác" : "Accuracy"} value={`${item.accuracy}%`} />
          <HistoryMetric label={lang === "vi" ? "Thời gian" : "Duration"} value={formatTime(item.durationSeconds)} />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={!wrong.length} onClick={onShowWrong}>{lang === "vi" ? "Xem danh sách câu sai" : "View wrong answers"}</button>
          <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" disabled={!wrong.length} onClick={onRetry}>{lang === "vi" ? "Làm lại câu sai" : "Retry wrong answers"}</button>
        </div>
      </div> : null}
    </article>
  )
}

function WrongAnswersDialog({ item, lang, onClose, onRetry }: {
  item?: HistoryItem
  lang: Lang
  onClose: () => void
  onRetry: () => void
}) {
  const wrong = item?.wrongQuestions ?? []
  return (
    <Dialog
      open={Boolean(item)}
      onClose={onClose}
      title={lang === "vi" ? "Danh sách câu sai" : "Wrong answers"}
      closeLabel={lang === "vi" ? "Đóng" : "Close"}
      className="z-[100]"
      panelClassName={cn("max-w-[720px] rounded-[18px] border-2 border-[#E5E5E5] bg-white shadow-[0_6px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none", modalFrameClass)}
    >
      <div className={modalHeaderClass}>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-[#100F3E] dark:text-white">{lang === "vi" ? "Danh sách câu sai" : "Wrong answers"}</h2>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{item?.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{wrong.length} {lang === "vi" ? "câu" : "questions"}</span>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={lang === "vi" ? "Đóng" : "Close"}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className={cn(modalBodyClass, "space-y-3")}>
        {wrong.map((question, index) => <div key={question.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-[#129BDC] shadow-sm dark:bg-slate-800">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <p className="w-full min-w-0 text-sm font-bold leading-5 text-[#100F3E] dark:text-white sm:flex-1">{question.prompt}</p>
                {question.wasSkipped ? <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-extrabold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{lang === "vi" ? "Chưa làm" : "Skipped"}</span> : null}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-emerald-600">{lang === "vi" ? "Đáp án đúng" : "Correct answer"}: {question.correctAnswer}</p>
            </div>
          </div>
        </div>)}
      </div>
      <div className={modalFooterClass}>
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>{lang === "vi" ? "Đóng" : "Close"}</button>
        <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" disabled={!wrong.length} onClick={onRetry}>{lang === "vi" ? "Làm lại câu sai" : "Retry wrong answers"}</button>
      </div>
    </Dialog>
  )
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5"><p className="text-lg font-black text-[#100F3E] dark:text-white">{value}</p><p className="text-xs font-bold text-slate-400">{label}</p></div>
}

function SettingsView({ lang, theme, onToggleLang, onToggleTheme, onOpenContact }: DashboardPageProps) {
  const t = copy[lang]
  const { profile, updateProfile, signOut, user } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => readStorage(`quizpka:${user?.id ?? "anonymous"}:sound-enabled`) !== "false")
  const [leaderboardVisible, setLeaderboardVisible] = useState(() => readStorage(`quizpka:${user?.id ?? "anonymous"}:leaderboard-visible`) !== "false")
  const [emailUpdates, setEmailUpdates] = useState(() => readStorage(`quizpka:${user?.id ?? "anonymous"}:email-updates`) === "true")

  useEffect(() => { setDisplayName(profile?.display_name ?? "") }, [profile?.display_name])
  useEffect(() => {
    writeStorage(`quizpka:${user?.id ?? "anonymous"}:sound-enabled`, String(soundEnabled))
  }, [soundEnabled, user?.id])
  useEffect(() => {
    writeStorage(`quizpka:${user?.id ?? "anonymous"}:leaderboard-visible`, String(leaderboardVisible))
  }, [leaderboardVisible, user?.id])
  useEffect(() => {
    writeStorage(`quizpka:${user?.id ?? "anonymous"}:email-updates`, String(emailUpdates))
  }, [emailUpdates, user?.id])

  const saveProfile = async () => {
    setSaving(true); setSaved(false); setSaveError(false)
    try { await updateProfile({ display_name: displayName.trim() || undefined }); setSaved(true) } catch { setSaveError(true) } finally { setSaving(false) }
  }

  return (
    <section className="dashboard-reveal mx-auto max-w-5xl">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_3px_0_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.3)] sm:rounded-[20px] sm:p-6 sm:shadow-[0_4px_0_rgba(15,23,42,0.06)] dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.3)] lg:col-span-2">
          <div><h3 className="text-lg font-black text-[#100F3E] dark:text-white sm:text-xl">{lang === "vi" ? "Thông tin cá nhân" : "Profile"}</h3><p className="mt-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">{lang === "vi" ? "Thông tin tài khoản Google" : "Your Google account"}</p></div>
          <div className="mt-6 grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
            <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8 dark:border-white/10">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-[20px] object-cover shadow-md sm:h-24 sm:w-24 sm:rounded-3xl" /> : <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-sky-50 text-sky-500 dark:bg-sky-500/10 sm:h-24 sm:w-24 sm:rounded-3xl"><UserRound className="h-8 w-8 sm:h-9 sm:w-9" /></div>}<p className="mt-3 text-xs font-bold text-slate-400 sm:mt-4">Email</p><p className="mt-1 max-w-full truncate text-center text-sm font-bold text-slate-700 dark:text-slate-200">{profile?.email}</p></div>
            <div className="min-w-0 self-center"><label className="block text-sm font-extrabold text-slate-600 dark:text-slate-300">{lang === "vi" ? "Tên hiển thị" : "Display name"}<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-700 dark:focus:ring-sky-500/10" maxLength={80} /></label><button type="button" className="lp-btn lp-btn--primary lp-btn--sm mt-4 w-full sm:w-auto" disabled={saving} onClick={() => void saveProfile()}>{saving ? (lang === "vi" ? "Đang lưu…" : "Saving…") : saved ? (lang === "vi" ? "Đã lưu" : "Saved") : (lang === "vi" ? "Lưu thay đổi" : "Save changes")}</button></div>
          </div>
          {saveError && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{lang === "vi" ? "Không thể lưu thay đổi. Vui lòng thử lại." : "Could not save changes. Please try again."}</p>}
        </div>
        <SettingRow icon={Languages} title={t.language}>
          <button type="button" className="lp-chip is-active min-w-[112px] justify-center" onClick={onToggleLang}>{lang === "vi" ? t.vietnamese : t.english}</button>
        </SettingRow>
        <SettingRow icon={theme === "light" ? Sun : Moon} title={t.appearance}>
          <button type="button" className="lp-chip is-active min-w-[112px] justify-center" onClick={onToggleTheme}>{theme === "light" ? t.light : t.dark}</button>
        </SettingRow>
        <div className="flex flex-col gap-4 rounded-[20px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)] md:col-span-2 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[#100F3E] dark:text-white">{t.supportTitle}</h3>
          </div>
           <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 md:w-auto md:min-w-[540px]">
             <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm w-full whitespace-normal text-center" onClick={() => onOpenContact("Contribute")}>{t.contribute}</button>
             <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm w-full whitespace-normal text-center" onClick={() => onOpenContact("Support")}>{t.support}</button>
             <button type="button" className="lp-btn lp-btn--primary lp-btn--sm w-full whitespace-normal text-center" onClick={() => onOpenContact("Report")}>Báo lỗi</button>
          </div>
        </div>
        <div className="space-y-3 rounded-[20px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)] md:col-span-2">
          <h3 className="text-lg font-black text-[#100F3E] dark:text-white">{lang === "vi" ? "Thiết lập" : "Settings"}</h3>
          <ToggleRow label={lang === "vi" ? "Bật âm thanh mặc định" : "Enable sound by default"} checked={soundEnabled} onChange={setSoundEnabled} />
          <ToggleRow label={lang === "vi" ? "Cho phép hiển thị trên bảng xếp hạng" : "Show me on the leaderboard"} checked={leaderboardVisible} onChange={setLeaderboardVisible} />
          <ToggleRow label={lang === "vi" ? "Nhận thông báo qua email" : "Receive email updates"} checked={emailUpdates} onChange={setEmailUpdates} />
        </div>
        <div className="rounded-[20px] border-2 border-red-100 bg-red-50/60 p-5 dark:border-red-500/20 dark:bg-red-500/5 md:col-span-2 lg:hidden">
          <h3 className="text-lg font-black text-red-700 dark:text-red-300">{lang === "vi" ? "Tài khoản" : "Account"}</h3>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm lp-btn--block mt-4" onClick={() => void signOut().then(() => navigateApp(appRoutes.home, { replace: true }))}><LogOut className="h-4 w-4" />{lang === "vi" ? "Đăng xuất" : "Sign out"}</button>
        </div>
      </div>
    </section>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-3.5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-sky-200 dark:border-white/10 dark:text-slate-300 dark:hover:border-sky-400/30"><span className="max-w-[80%] leading-5">{label}</span><span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" /><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" /></span></label>
}

function SettingRow({ icon: Icon, title, children }: { icon: ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-slate-100 text-slate-500 dark:bg-white/5"><Icon className="h-5 w-5" /></div><span className="font-extrabold text-[#100F3E] dark:text-white">{title}</span></div>
      {children}
    </div>
  )
}

function MobileNav({ activeView, lang, onNavigate }: { activeView: DashboardView; lang: Lang; onNavigate: (view: DashboardView) => void }) {
  return (
    <MobileTabBar
      ariaLabel="Mobile dashboard"
      activeKey={activeView}
      onNavigate={onNavigate}
      items={navItems.map((item) => ({
        key: item.key,
        icon: mobileNavIcons[item.key],
        label: mobileNavLabels[lang][item.key as keyof typeof mobileNavLabels["vi"]],
      }))}
    />
  )
}

