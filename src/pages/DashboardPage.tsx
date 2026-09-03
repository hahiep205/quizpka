import { useEffect, useMemo, useState, type ComponentType } from "react"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  History,
  Languages,
  Moon,
  Search,
  Settings,
  Sun,
  Trophy,
  UserRound,
  LogOut,
} from "lucide-react"
import brandLogo from "@/assets/logo.png"
import { QuizSetupModal } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { PdfViewerModal } from "@/components/PdfViewerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { cn } from "@/lib/utils"
import { dashboardCopy as copy } from "@/shared/i18n"
import { useExamLaunch } from "@/lib/useExamLaunch"
import type { Language, Theme } from "@/shared/types/app"
import { useAuth } from "@/auth/AuthProvider"
import { navigate, appRoutes, getCurrentPath } from "@/app/navigation"
import { readStorage, writeStorage } from "@/lib/storage"
import { goToPractice, readPracticeHistory } from "@/lib/practiceSession"
import { formatTime } from "@/features/quiz/lib/quizHelpers"

type Lang = Language
type DashboardView = "home" | "leaderboard" | "history" | "settings"

type DashboardPageProps = {
  lang: Lang
  theme: Theme
  onToggleLang: () => void
  onToggleTheme: () => void
}

const navItems: Array<{
  key: DashboardView
  icon: ComponentType<{ className?: string }>
}> = [
  { key: "home", icon: SidebarHomeIcon },
  { key: "leaderboard", icon: SidebarRankingIcon },
  { key: "history", icon: SidebarHistoryIcon },
  { key: "settings", icon: SidebarSettingsIcon },
]

function SidebarSvg({ className, children }: { className?: string; children: React.ReactNode }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{children}</svg>
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
    home: "TRANG CHỦ",
    leaderboard: "XẾP HẠNG",
    history: "LỊCH SỬ",
    settings: "CÀI ĐẶT",
  },
  en: {
    home: "HOME",
    leaderboard: "RANKING",
    history: "HISTORY",
    settings: "SETTINGS",
  },
} as const

export function DashboardPage({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
}: DashboardPageProps) {
  const [activeView, setActiveView] = useState<DashboardView>(() => getDashboardView(getCurrentPath()))
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "general" | "major">("all")
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
  } = useExamLaunch(lang)

  useEffect(() => {
    const syncView = () => setActiveView(getDashboardView(getCurrentPath()))
    window.addEventListener("popstate", syncView)
    return () => window.removeEventListener("popstate", syncView)
  }, [])

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(lang)
    return examCatalog.filter((exam) => {
      if (exam.subjectId === "toeic") return false
      const categoryKey = exam.category.en === "General" ? "general" : "major"
      const matchesFilter = filter === "all" || categoryKey === filter
      const haystack = `${exam.title[lang]} ${exam.subjectName[lang]} ${exam.subjectCode}`.toLocaleLowerCase(lang)
      return matchesFilter && (!normalized || haystack.includes(normalized))
    })
  }, [filter, lang, query])

  const navigate = (view: DashboardView) => {
    setActiveView(view)
    const paths: Record<DashboardView, string> = {
      home: appRoutes.dashboard,
      leaderboard: appRoutes.dashboardLeaderboard,
      history: appRoutes.dashboardHistory,
      settings: appRoutes.dashboardSettings,
    }
    window.history.pushState(null, "", paths[view])
    window.dispatchEvent(new PopStateEvent("popstate"))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-svh bg-[#F6F7FB] text-[#100F3E] transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <DesktopSidebar activeView={activeView} lang={lang} onNavigate={navigate} />

      <div className="lg:pl-[200px]">
        <DashboardTopbar
          lang={lang}
          theme={theme}
          onToggleLang={onToggleLang}
          onToggleTheme={onToggleTheme}
        />

        <main className="mx-auto w-full max-w-[1440px] px-3 pb-[calc(92px+env(safe-area-inset-bottom))] pt-4 min-[380px]:px-4 sm:px-6 sm:pt-6 md:px-8 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
          {activeView === "home" ? (
            <HomeDashboard
              lang={lang}
              query={query}
              filter={filter}
              filteredExams={filteredExams}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onStartExam={handleTryNow}
            />
          ) : null}
          {activeView === "leaderboard" ? <LeaderboardView lang={lang} /> : null}
          {activeView === "history" ? <EmptyView lang={lang} view="history" /> : null}
          {activeView === "settings" ? (
            <SettingsView
              lang={lang}
              theme={theme}
              onToggleLang={onToggleLang}
              onToggleTheme={onToggleTheme}
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

      <QuizSetupModal
        open={Boolean(setupExam)}
        lang={lang}
        exam={setupExam}
        subject={setupSubject}
        onClose={handleSetupClose}
        onStart={handleSetupStart}
      />
    </div>
  )
}

function getDashboardView(path: string): DashboardView {
  if (path === appRoutes.dashboardLeaderboard) return "leaderboard"
  if (path === appRoutes.dashboardHistory) return "history"
  if (path === appRoutes.dashboardSettings) return "settings"
  return "home"
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
  const handleSignOut = () => { void signOut().then(() => navigate(appRoutes.home, { replace: true })) }
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

function DashboardTopbar({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
}: DashboardPageProps) {
  const t = copy[lang]
  const { profile } = useAuth()
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:h-[72px] sm:px-6 md:px-8 lg:h-[78px] lg:px-8 xl:px-10">
        <a href="/" className="lg:hidden" aria-label="QuizPKA">
          <img src={brandLogo} alt="QuizPKA" className="h-7 w-auto" />
        </a>

        <div className="ml-auto flex min-w-0 items-center gap-2 lg:hidden">
          <div className="hidden items-center gap-2 sm:flex">
            <TopbarButton label={lang === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"} onClick={onToggleLang}>
              <span className="text-[11px] font-black text-[#129BDC]">{lang.toUpperCase()}</span>
            </TopbarButton>
            <TopbarButton label={theme === "light" ? (lang === "vi" ? "Chuyển sang giao diện tối" : "Switch to dark mode") : (lang === "vi" ? "Chuyển sang giao diện sáng" : "Switch to light mode")} onClick={onToggleTheme}>
              {theme === "light" ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />}
            </TopbarButton>
          </div>
          <div className="ml-1 flex min-w-0 items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-3 dark:sm:border-white/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#E8F7FE] text-[#129BDC]">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-[11px] object-cover" /> : <UserRound className="h-4 w-4" />}
            </div>
            <span className="hidden max-w-[150px] truncate text-sm font-extrabold text-[#100F3E] dark:text-white min-[520px]:block">{profile?.display_name ?? profile?.email}</span>
          </div>
        </div>

        <div className="hidden lg:block">
          <h1 className="text-base font-semibold text-[#100F3E] dark:text-white">
            {t.hello}, {profile?.display_name ?? t.student}!
          </h1>
        </div>

        <div className="ml-auto hidden items-center gap-2.5 lg:flex">
          <TopbarButton
            label={lang === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}
            onClick={onToggleLang}
          >
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <Languages className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="absolute -bottom-1 -right-1 rounded bg-primary-600 px-1 text-[7px] font-bold leading-none text-white dark:bg-white dark:text-slate-900">
                {lang.toUpperCase()}
              </span>
            </span>
          </TopbarButton>
          <TopbarButton
            label={
              theme === "light"
                ? lang === "vi" ? "Chuyển sang giao diện tối" : "Switch to dark mode"
                : lang === "vi" ? "Chuyển sang giao diện sáng" : "Switch to light mode"
            }
            onClick={onToggleTheme}
          >
            <span className="relative h-4 w-4">
              <Sun
                className={cn(
                  "absolute inset-0 h-4 w-4 transition-all duration-200",
                  theme === "light"
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-75 -rotate-90 opacity-0"
                )}
                strokeWidth={2}
              />
              <Moon
                className={cn(
                  "absolute inset-0 h-4 w-4 transition-all duration-200",
                  theme === "dark"
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-75 rotate-90 opacity-0"
                )}
                strokeWidth={2}
              />
            </span>
          </TopbarButton>
          <div className="ml-0.5 hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-white/10 sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#129BDC]">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-[12px] object-cover" /> : <UserRound className="h-5 w-5" strokeWidth={2.2} />}
            </div>
            <div className="max-w-[140px] truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{profile?.display_name ?? profile?.email}</div>
          </div>
        </div>
      </div>
    </header>
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
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[var(--shadow-1)] transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {children}
    </button>
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
  filter: "all" | "general" | "major"
  filteredExams: ExamCatalogItem[]
  onQueryChange: (value: string) => void
  onFilterChange: (value: "all" | "general" | "major") => void
  onStartExam: (exam: ExamCatalogItem) => void
}) {
  const t = copy[lang]
  const { user } = useAuth()
  const userId = user?.id
  const userCreatedAt = user?.created_at
  const attemptCountsBySubject = useMemo(() => {
    const counts = new Map<string, number>()
    if (!userId) return counts
    for (const attempt of readPracticeHistory(userId, userCreatedAt)) {
      counts.set(attempt.subjectId, (counts.get(attempt.subjectId) ?? 0) + 1)
    }
    return counts
  }, [userCreatedAt, userId])

  return (
    <div className="space-y-6 dashboard-reveal sm:space-y-8">
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Statistics">
        <DashboardStatCard icon={Flame} value="0" label={t.streak} tone="orange" />
        <DashboardStatCard icon={CheckCircle2} value="0" label={t.completed} tone="green" />
        <DashboardStatCard icon={BarChart3} value="--" label={t.accuracy} tone="blue" />
        <DashboardStatCard icon={Clock3} value="0h" label={t.studyTime} tone="violet" />
      </section>

      <section id="dashboard-documents" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-[-0.025em] text-[#100F3E] dark:text-white sm:text-[26px] lg:text-[28px]">
              {t.documentTitle}
            </h2>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:mt-1.5 sm:text-sm">
              {t.documentDesc}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block sm:w-[250px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t.search}
                className="h-11 w-full rounded-[12px] border-2 border-[#E5E5E5] bg-white pl-10 pr-3 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none transition focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]"
              />
            </label>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:grid-cols-none sm:grid-flow-col">
              {(["all", "general", "major"] as const).map((item) => (
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
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                lang={lang}
                attemptCount={attemptCountsBySubject.get(exam.subjectId) ?? 0}
                onStart={() => onStartExam(exam)}
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

function DashboardStatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  value: string
  label: string
  tone: "orange" | "green" | "blue" | "violet"
}) {
  const tones = {
    orange: "bg-orange-50 text-orange-500 dark:bg-orange-500/10",
    green: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10",
    blue: "bg-sky-50 text-[#1CB0F6] dark:bg-sky-500/10",
    violet: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10",
  }
  return (
    <div className="flex min-h-[106px] flex-col justify-between rounded-[14px] border-2 border-[#E5E5E5] bg-white p-3.5 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:min-h-0 sm:flex-row sm:items-center sm:gap-4 sm:rounded-[16px] sm:p-4 sm:shadow-[0_4px_0_#DCDCDC] dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] sm:h-12 sm:w-12 sm:rounded-[12px]", tones[tone])}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
      </div>
      <div className="mt-2.5 min-w-0 sm:mt-0 sm:flex-1">
        <p className="text-lg font-black tracking-[-0.02em] text-[#100F3E] dark:text-white sm:text-xl">{value}</p>
        <p className="mt-0.5 text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      </div>
    </div>
  )
}

function ExamCard({ exam, lang, attemptCount, onStart }: { exam: ExamCatalogItem; lang: Lang; attemptCount: number; onStart: () => void }) {
  const t = copy[lang]
  return (
    <article className="group flex h-full flex-col rounded-[15px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:rounded-[16px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300 sm:h-12 sm:w-12 sm:rounded-[14px]">
          <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
        </div>
        <Badge className="border-0 bg-[#E8F7FE] font-extrabold text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
          {exam.category.en === "General" ? t.general : t.major}
        </Badge>
      </div>
      <div className="mt-4 flex-1 sm:mt-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1CB0F6]">{exam.subjectCode}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[17px] font-black leading-6 tracking-[-0.02em] text-[#100F3E] dark:text-white sm:mt-2 sm:text-lg">
          {exam.title[lang]}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {exam.description[lang]}
        </p>
      </div>
      <div className="mt-5 grid grid-cols-3 border-t border-slate-100 pt-4 text-[11px] font-bold text-[#129BDC] dark:border-white/10 dark:text-sky-300 sm:text-xs">
        <span className="inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap px-1"><FileText className="h-3.5 w-3.5 shrink-0" />{exam.questionCount} {t.questions}</span>
        <span className="inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap border-x border-slate-100 px-1 dark:border-white/10"><Clock3 className="h-3.5 w-3.5 shrink-0" />{exam.durationMinutes} {t.minutes}</span>
        <span className="inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap px-1"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{attemptCount} {lang === "vi" ? "lượt làm" : attemptCount === 1 ? "attempt" : "attempts"}</span>
      </div>
      <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-4 sm:mt-5" onClick={onStart}>
        {t.start}
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}

function LeaderboardView({ lang }: { lang: Lang }) {
  const t = copy[lang]
  return (
    <section className="dashboard-reveal mx-auto max-w-5xl">
      <PageHeading title={t.leaderboardTitle} description={t.leaderboardDesc} icon={Trophy} />
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
        <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="mt-4 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
          {lang === "vi" ? "Bảng xếp hạng sẽ được mở khi hệ thống tích lũy điểm học tập." : "The leaderboard will appear when learning points are available."}
        </p>
      </div>
    </section>
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
      setup: { ...item.setup, mode: "practice", questionLimit: undefined },
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
      <PageHeading title={t.historyTitle} description={t.historyDesc} icon={History} />
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
      panelClassName="flex max-h-[min(780px,92vh)] w-full max-w-[720px] flex-col overflow-hidden rounded-[18px] border-2 border-[#E5E5E5] bg-white shadow-[0_6px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-[#100F3E] dark:text-white">{lang === "vi" ? "Danh sách câu sai" : "Wrong answers"}</h2>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{item?.title}</p>
        </div>
        <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{wrong.length} {lang === "vi" ? "câu" : "questions"}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
        {wrong.map((question, index) => <div key={question.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-[#129BDC] shadow-sm dark:bg-slate-800">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-bold leading-5 text-[#100F3E] dark:text-white">{question.prompt}</p>
                {question.wasSkipped ? <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-extrabold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{lang === "vi" ? "Chưa làm" : "Skipped"}</span> : null}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-emerald-600">{lang === "vi" ? "Đáp án đúng" : "Correct answer"}: {question.correctAnswer}</p>
            </div>
          </div>
        </div>)}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-white/10 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>{lang === "vi" ? "Đóng" : "Close"}</button>
        <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" disabled={!wrong.length} onClick={onRetry}>{lang === "vi" ? "Làm lại câu sai" : "Retry wrong answers"}</button>
      </div>
    </Dialog>
  )
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5"><p className="text-lg font-black text-[#100F3E] dark:text-white">{value}</p><p className="text-xs font-bold text-slate-400">{label}</p></div>
}

function SettingsView({ lang, theme, onToggleLang, onToggleTheme }: DashboardPageProps) {
  const t = copy[lang]
  const { profile, updateProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => readStorage("quizpka-sound-enabled") !== "false")
  const [leaderboardVisible, setLeaderboardVisible] = useState(() => readStorage("quizpka-leaderboard-visible") !== "false")
  const [emailUpdates, setEmailUpdates] = useState(() => readStorage("quizpka-email-updates") === "true")

  useEffect(() => { setDisplayName(profile?.display_name ?? "") }, [profile?.display_name])
  useEffect(() => { writeStorage("quizpka-sound-enabled", String(soundEnabled)) }, [soundEnabled])
  useEffect(() => { writeStorage("quizpka-leaderboard-visible", String(leaderboardVisible)) }, [leaderboardVisible])
  useEffect(() => { writeStorage("quizpka-email-updates", String(emailUpdates)) }, [emailUpdates])

  const saveProfile = async () => {
    setSaving(true); setSaved(false); setSaveError(false)
    try { await updateProfile({ display_name: displayName.trim() || undefined }); setSaved(true) } catch { setSaveError(true) } finally { setSaving(false) }
  }

  return (
    <section className="dashboard-reveal mx-auto max-w-5xl">
      <PageHeading title={t.settingsTitle} description={t.settingsDesc} icon={Settings} />
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
        <div className="space-y-3 rounded-[20px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)] md:col-span-2">
          <h3 className="text-lg font-black text-[#100F3E] dark:text-white">{lang === "vi" ? "Thiết lập" : "Settings"}</h3>
          <ToggleRow label={lang === "vi" ? "Bật âm thanh mặc định" : "Enable sound by default"} checked={soundEnabled} onChange={setSoundEnabled} />
          <ToggleRow label={lang === "vi" ? "Cho phép hiển thị trên bảng xếp hạng" : "Show me on the leaderboard"} checked={leaderboardVisible} onChange={setLeaderboardVisible} />
          <ToggleRow label={lang === "vi" ? "Nhận thông báo qua email" : "Receive email updates"} checked={emailUpdates} onChange={setEmailUpdates} />
        </div>
        <div className="rounded-[20px] border-2 border-red-100 bg-red-50/60 p-5 dark:border-red-500/20 dark:bg-red-500/5 md:col-span-2 lg:hidden">
          <h3 className="text-lg font-black text-red-700 dark:text-red-300">{lang === "vi" ? "Tài khoản" : "Account"}</h3>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm lp-btn--block mt-4" onClick={() => void signOut().then(() => navigate(appRoutes.home, { replace: true }))}><LogOut className="h-4 w-4" />{lang === "vi" ? "Đăng xuất" : "Sign out"}</button>
        </div>
      </div>
    </section>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-3.5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-sky-200 dark:border-white/10 dark:text-slate-300 dark:hover:border-sky-400/30"><span className="max-w-[80%] leading-5">{label}</span><span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" /><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" /></span></label>
}

function PageHeading({ title, description, icon: Icon }: { title: string; description: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-5 flex items-center gap-3 sm:mb-7 sm:gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10 sm:h-14 sm:w-14 sm:rounded-[16px]"><Icon className="h-5 w-5 sm:h-7 sm:w-7" /></div>
      <div className="min-w-0"><h2 className="text-[22px] font-black leading-7 tracking-[-0.03em] text-[#100F3E] dark:text-white sm:text-[28px]">{title}</h2><p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">{description}</p></div>
    </div>
  )
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
    <nav
      className="fixed inset-x-0 bottom-0 z-[300] h-[calc(68px+env(safe-area-inset-bottom))] overflow-hidden rounded-t-[20px] border-t-2 border-[#E5E5E5] bg-white/[0.97] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/[0.97] sm:h-[calc(72px+env(safe-area-inset-bottom))] sm:rounded-t-[24px] lg:hidden"
      aria-label="Mobile dashboard"
    >
      <div className="mx-auto flex h-[68px] max-w-2xl items-stretch px-1.5 sm:h-[72px] sm:px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.key
          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.key)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 transition-all duration-200",
                isActive
                  ? "text-[#1CB0F6] dark:text-sky-300"
                  : "text-[#AFAFAF] hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              <span
                className={cn(
                  "flex h-7 items-center justify-center transition-transform duration-200",
                  isActive && "-translate-y-0.5"
                )}
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span
                className="block max-w-full truncate py-0.5 text-[10px] font-bold leading-[1.3] tracking-[0.01em] min-[420px]:text-[10.5px] sm:text-[11px]"
                style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
              >
                {mobileNavLabels[lang][item.key]}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
