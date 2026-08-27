import { useMemo, useState, type ComponentType } from "react"
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
  Home,
  Languages,
  Medal,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  UserRound,
} from "lucide-react"
import brandLogo from "@/assets/logo.png"
import { QuizSetupModal } from "@/components/QuizSetupModal"
import { HcmChapterPickerModal } from "@/components/HcmChapterPickerModal"
import { TadvPickerModal } from "@/components/TadvPickerModal"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { examCatalog, getSubjectById, type ExamCatalogItem } from "@/data/subjects"
import { cn } from "@/lib/utils"
import { dashboardCopy as copy } from "@/shared/i18n"
import { useChapterPractice } from "@/lib/useChapterPractice"
import { tadvExamOptions } from "@/data/tadvExams"
import type { Language, Theme } from "@/shared/types/app"

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
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}> = [
  { key: "home", icon: Home },
  { key: "leaderboard", icon: Trophy },
  { key: "history", icon: History },
  { key: "settings", icon: Settings },
]

const mobileNavLabels = {
  vi: {
    home: "TRANG CHỦ",
    leaderboard: "BẢNG XẾP HẠNG",
    history: "LỊCH SỬ",
    settings: "CÀI ĐẶT",
  },
  en: {
    home: "HOME",
    leaderboard: "LEADERBOARD",
    history: "HISTORY",
    settings: "SETTINGS",
  },
} as const

const ranking = [
  { name: "Minh Anh", points: 1280, tone: "bg-amber-100 text-amber-700" },
  { name: "Quốc Bảo", points: 1160, tone: "bg-slate-200 text-slate-600" },
  { name: "Thu Hà", points: 1040, tone: "bg-orange-100 text-orange-700" },
  { name: "Bạn", points: 860, tone: "bg-sky-100 text-sky-700" },
]

export function DashboardPage({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
}: DashboardPageProps) {
  const [activeView, setActiveView] = useState<DashboardView>("home")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "general" | "major">("all")
  const [tadvPickerExam, setTadvPickerExam] = useState<ExamCatalogItem | null>(null)
  const {
    pickerExam: hcmPickerExam,
    setupExam,
    pickerSubject,
    setupSubject,
    handleTryNow: handleChapterTryNow,
    handlePickerSelect,
    handlePickerClose,
    handleSetupClose,
    handleSetupStart,
    setSetupExam,
  } = useChapterPractice(lang)

  const handleTryNow = (exam: ExamCatalogItem) => {
    if (exam.subjectId === "tieng-anh-dau-vao") {
      setTadvPickerExam(exam)
    } else {
      handleChapterTryNow(exam)
    }
  }

  const handleTadvSelect = (examId: string) => {
    const opt = tadvExamOptions.find((o) => o.id === examId)
    if (!opt || !tadvPickerExam) return
    const newExam: ExamCatalogItem = {
      ...tadvPickerExam,
      id: opt.id,
      title: opt.title,
      description: opt.description,
      questionBanks: opt.questionBanks,
    }
    setSetupExam(newExam)
    setTadvPickerExam(null)
  }

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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-svh bg-[#F6F7FB] text-[#100F3E] transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <DesktopSidebar activeView={activeView} lang={lang} onNavigate={navigate} />

      <div className="lg:pl-[252px]">
        <DashboardTopbar
          lang={lang}
          theme={theme}
          onToggleLang={onToggleLang}
          onToggleTheme={onToggleTheme}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
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
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-slate-900 lg:flex lg:flex-col">
      <a href="/" className="flex h-12 items-center px-3" aria-label="QuizPKA">
        <img src={brandLogo} alt="QuizPKA" className="h-8 w-auto object-contain" />
      </a>

      <nav className="mt-8 flex flex-1 flex-col gap-2" aria-label="Dashboard">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={cn(
                "group flex h-12 w-full items-center gap-3 rounded-[12px] px-4 text-left text-[15px] font-extrabold transition-all",
                isActive
                  ? "bg-[#E8F7FE] text-[#129BDC] shadow-[inset_3px_0_0_#1CB0F6] dark:bg-sky-500/10 dark:text-sky-300"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#100F3E] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
              {t.nav[item.key]}
            </button>
          )
        })}
      </nav>

      <div className="rounded-[16px] border-2 border-[#D9F2FD] bg-[#F3FBFF] p-4 dark:border-sky-400/15 dark:bg-sky-500/5">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1CB0F6] text-white shadow-[0_3px_0_#189CD8]">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="text-sm font-extrabold text-[#100F3E] dark:text-white">QuizPKA</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {lang === "vi" ? "Ôn tập thông minh, thi cử tự tin." : "Practise smarter, test with confidence."}
        </p>
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
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-[78px] lg:px-8 xl:px-10">
        <a href="/" className="lg:hidden" aria-label="QuizPKA">
          <img src={brandLogo} alt="QuizPKA" className="h-7 w-auto" />
        </a>

        <div className="hidden lg:block">
          <p className="text-[13px] font-bold text-slate-400">{t.hello},</p>
          <h1 className="mt-0.5 text-xl font-black tracking-[-0.02em] text-[#100F3E] dark:text-white">
            {t.student} <span aria-hidden="true">👋</span>
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
              <UserRound className="h-5 w-5" strokeWidth={2.2} />
            </div>
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
  return (
    <div className="space-y-8 dashboard-reveal">
      <section className="relative isolate overflow-hidden rounded-[20px] bg-[#1CB0F6] px-5 py-7 text-white shadow-[0_5px_0_#189CD8] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <div className="absolute -right-10 -top-16 -z-10 h-64 w-64 rounded-full border-[38px] border-white/10" />
        <div className="absolute -bottom-20 right-48 -z-10 h-44 w-44 rounded-full bg-white/10 blur-sm" />
        <div className="absolute right-[7%] top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative flex h-44 w-44 rotate-3 items-center justify-center rounded-[36px] border-4 border-white/25 bg-white/15 shadow-2xl backdrop-blur-sm">
            <Trophy className="h-24 w-24 text-[#FFF38A]" strokeWidth={1.8} />
            <Sparkles className="absolute -right-3 top-2 h-8 w-8 text-white" />
            <Medal className="absolute -bottom-4 -left-4 h-14 w-14 -rotate-12 text-[#FFE05C]" />
          </div>
        </div>

        <div className="max-w-2xl lg:max-w-[62%]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em]">
            <Flame className="h-4 w-4 text-[#FFF38A]" fill="currentColor" />
            {t.bannerEyebrow}
          </div>
          <h2 className="max-w-[650px] text-[28px] font-black leading-[1.15] tracking-[-0.035em] sm:text-4xl lg:text-[42px]">
            {t.bannerTitle}
          </h2>
          <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/85 sm:text-[15px]">
            {t.bannerDesc}
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("dashboard-documents")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-[12px] bg-white px-5 text-sm font-black uppercase tracking-[0.04em] text-[#129BDC] shadow-[0_4px_0_#CBEFFF] transition-all hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-[0_1px_0_#CBEFFF]"
          >
            {t.bannerButton}
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Statistics">
        <StatCard icon={Flame} value="5" label={t.streak} tone="orange" />
        <StatCard icon={CheckCircle2} value="0" label={t.completed} tone="green" />
        <StatCard icon={BarChart3} value="--" label={t.accuracy} tone="blue" />
        <StatCard icon={Clock3} value="0h" label={t.studyTime} tone="violet" />
      </section>

      <section id="dashboard-documents" className="scroll-mt-24">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.025em] text-[#100F3E] dark:text-white sm:text-[28px]">
              {t.documentTitle}
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
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
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {(["all", "general", "major"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onFilterChange(item)}
                  className={cn("lp-chip min-h-10", filter === item && "is-active")}
                >
                  {t[item]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredExams.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} lang={lang} onStart={() => onStartExam(exam)} />
            ))}
          </div>
        ) : (
          <Card variant="dashed" className="py-14 text-center">
            <FileText className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">{t.empty}</p>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black tracking-[-0.02em] text-[#100F3E] dark:text-white">
          {t.activity}
        </h2>
        <div className="flex min-h-32 items-center gap-4 rounded-[16px] border-2 border-dashed border-slate-200 bg-white/65 p-5 dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-100 text-slate-400 dark:bg-white/5">
            <History className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{t.activityEmpty}</p>
        </div>
      </section>
    </div>
  )
}

function StatCard({
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
    <div className="flex min-h-[118px] flex-col justify-between rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:min-h-0 sm:flex-row sm:items-center sm:gap-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] sm:h-12 sm:w-12", tones[tone])}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
      </div>
      <div className="mt-3 min-w-0 sm:mt-0 sm:flex-1">
        <p className="text-xl font-black tracking-[-0.02em] text-[#100F3E] dark:text-white">{value}</p>
        <p className="mt-0.5 text-xs font-bold leading-4 text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function ExamCard({ exam, lang, onStart }: { exam: ExamCatalogItem; lang: Lang; onStart: () => void }) {
  const t = copy[lang]
  return (
    <article className="group flex h-full flex-col rounded-[16px] border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_4px_0_#DCDCDC] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">
          <BookOpen className="h-6 w-6" strokeWidth={2} />
        </div>
        <Badge className="border-0 bg-emerald-50 font-extrabold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
          {exam.category.en === "General" ? t.general : t.major}
        </Badge>
      </div>
      <div className="mt-5 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1CB0F6]">{exam.subjectCode}</p>
        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 tracking-[-0.02em] text-[#100F3E] dark:text-white">
          {exam.title[lang]}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {exam.description[lang]}
        </p>
      </div>
      <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />{exam.questionCount} {t.questions}</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{exam.durationMinutes} {t.minutes}</span>
      </div>
      <button type="button" className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-5" onClick={onStart}>
        {t.start}
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}

function LeaderboardView({ lang }: { lang: Lang }) {
  const t = copy[lang]
  return (
    <section className="dashboard-reveal mx-auto max-w-4xl">
      <PageHeading title={t.leaderboardTitle} description={t.leaderboardDesc} icon={Trophy} />
      <div className="overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-[64px_1fr_auto] gap-3 border-b border-slate-100 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-400 dark:border-white/10">
          <span>{t.rank}</span><span>{t.learner}</span><span>{t.points}</span>
        </div>
        {ranking.map((item, index) => (
          <div key={item.name} className={cn("grid grid-cols-[64px_1fr_auto] items-center gap-3 px-5 py-4", index !== ranking.length - 1 && "border-b border-slate-100 dark:border-white/10", item.name === "Bạn" && "bg-sky-50/70 dark:bg-sky-500/5")}>
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-black", item.tone)}>#{index + 1}</span>
            <span className="font-extrabold text-[#100F3E] dark:text-white">{item.name === "Bạn" ? t.you : item.name}</span>
            <span className="font-black text-[#1CB0F6]">{item.points.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function EmptyView({ lang, view }: { lang: Lang; view: "history" }) {
  const t = copy[lang]
  return (
    <section className="dashboard-reveal mx-auto max-w-4xl">
      <PageHeading title={t.historyTitle} description={t.historyDesc} icon={History} />
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
          {view === "history" ? <CalendarDays className="h-8 w-8" /> : null}
        </div>
        <p className="mt-5 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{t.activityEmpty}</p>
      </div>
    </section>
  )
}

function SettingsView({ lang, theme, onToggleLang, onToggleTheme }: DashboardPageProps) {
  const t = copy[lang]
  return (
    <section className="dashboard-reveal mx-auto max-w-4xl">
      <PageHeading title={t.settingsTitle} description={t.settingsDesc} icon={Settings} />
      <div className="space-y-4">
        <SettingRow icon={Languages} title={t.language}>
          <button type="button" className="lp-chip is-active" onClick={onToggleLang}>{lang === "vi" ? t.vietnamese : t.english}</button>
        </SettingRow>
        <SettingRow icon={theme === "light" ? Sun : Moon} title={t.appearance}>
          <button type="button" className="lp-chip is-active" onClick={onToggleTheme}>{theme === "light" ? t.light : t.dark}</button>
        </SettingRow>
      </div>
    </section>
  )
}

function PageHeading({ title, description, icon: Icon }: { title: string; description: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-7 flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10"><Icon className="h-7 w-7" /></div>
      <div><h2 className="text-[28px] font-black tracking-[-0.03em] text-[#100F3E] dark:text-white">{title}</h2><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{description}</p></div>
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
      className="fixed inset-x-0 bottom-0 z-[300] h-[calc(72px+env(safe-area-inset-bottom))] overflow-hidden rounded-t-[24px] border-t-2 border-[#E5E5E5] bg-white/[0.97] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/[0.97] lg:hidden"
      aria-label="Mobile dashboard"
    >
      <div className="mx-auto flex h-[72px] max-w-lg items-stretch px-1.5">
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
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.7 : 2.2} />
              </span>
              <span
                className="block max-w-full truncate py-0.5 text-[8.5px] font-bold leading-[1.35] tracking-[0.01em] min-[420px]:text-[9px]"
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
