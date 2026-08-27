import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { appRoutes, useAppPath } from "@/app/navigation"
import type { ContactModalType } from "@/components/ContactModal"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { appTranslations as translations } from "@/shared/i18n"
import { useGlobalSecurity } from "@/hooks/useGlobalSecurity"
import { SecurityOverlay } from "@/security/SecurityOverlay"
import { SiteHeader } from "@/app/layout/SiteHeader"
import { HeroSection } from "@/features/landing/HeroSection"
import { ToeicSection } from "@/features/landing/ToeicSection"
import { SiteFooter } from "@/app/layout/SiteFooter"
import type { Language, Theme } from "@/shared/types/app"

const ContactModal = lazy(() => import("@/components/ContactModal").then(({ ContactModal: component }) => ({ default: component })))
const LoginModal = lazy(() => import("@/components/LoginModal").then(({ LoginModal: component }) => ({ default: component })))
const ToeicAnnouncementModal = lazy(() => import("@/components/ToeicAnnouncementModal").then(({ ToeicAnnouncementModal: component }) => ({ default: component })))
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(({ DashboardPage: component }) => ({ default: component })))
const PracticeGuestPage = lazy(() => import("@/pages/PracticeGuestPage").then(({ PracticeGuestPage: component }) => ({ default: component })))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(({ NotFoundPage: component }) => ({ default: component })))

type Lang = Language

export default function App() {
  const pathname = useAppPath()
  const [contactOpen, setContactOpen] = useState(false)
  const [contactType, setContactType] = useState<ContactModalType | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("quizpka-lang")
    return saved === "vi" || saved === "en" ? saved : "vi"
  })
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("quizpka-theme")
    if (saved === "light" || saved === "dark") return saved
    return "light"
  })

  const t = useMemo(() => translations[lang], [lang])

  const { locked, setLocked } = useGlobalSecurity()

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
    localStorage.setItem("quizpka-theme", theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem("quizpka-lang", lang)
  }, [lang])

  // TOEIC announcement: show after 1s on homepage, "don't show today" persists per day
  useEffect(() => {
    if (pathname !== appRoutes.home) return
    try {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const dismissed = localStorage.getItem("quizpka-toeic-announcement-dismissed")
      if (dismissed === today) return
      const timer = window.setTimeout(() => setAnnouncementOpen(true), 1000)
      return () => window.clearTimeout(timer)
    } catch {
      const timer = window.setTimeout(() => setAnnouncementOpen(true), 1000)
      return () => window.clearTimeout(timer)
    }
  }, [pathname])

  const openContact = (type: ContactModalType) => {
    setContactType(type)
    setContactOpen(true)
  }

  const closeContact = () => {
    setContactOpen(false)
  }

  const openLogin = () => {
    setLoginOpen(true)
  }

  const closeLogin = () => {
    setLoginOpen(false)
  }

  const closeAnnouncement = () => setAnnouncementOpen(false)
  const handleDontShowToday = () => {
    try {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      localStorage.setItem("quizpka-toeic-announcement-dismissed", today)
    } catch {}
    setAnnouncementOpen(false)
  }
  const handleTryNow = () => {
    setAnnouncementOpen(false)
    window.setTimeout(() => {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 150)
  }
  const handleFeedback = () => {
    setAnnouncementOpen(false)
    openContact("Support")
  }

  const shellClassName =
    "relative min-h-svh bg-slate-50 transition-colors duration-300 dark:bg-slate-950"

  if (pathname === appRoutes.practice) {
    return (
      <div className={shellClassName}>
        {locked && <SecurityOverlay onClose={() => setLocked(false)} />}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_rgba(248,250,252,0.55)_45%,_#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(30,58,138,0.25)_0%,_rgba(2,6,23,0.2)_45%,_#020617_100%)]" />
        <Suspense fallback={<RouteLoading />}><PracticeGuestPage lang={lang} /></Suspense>
      </div>
    )
  }

  if (pathname === appRoutes.dashboard) {
    return (
      <>
        {locked && <SecurityOverlay onClose={() => setLocked(false)} />}
        <Suspense fallback={<RouteLoading />}><DashboardPage
          lang={lang}
          theme={theme}
          onToggleLang={() => setLang((current) => (current === "en" ? "vi" : "en"))}
          onToggleTheme={() =>
            setTheme((current) => (current === "light" ? "dark" : "light"))
          }
        /></Suspense>
      </>
    )
  }

  if (pathname !== appRoutes.home) return <Suspense fallback={<RouteLoading />}><NotFoundPage lang={lang} /></Suspense>

  return (
    <div className={shellClassName}>
      {locked && <SecurityOverlay onClose={() => setLocked(false)} />}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_rgba(248,250,252,0.55)_45%,_#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(30,58,138,0.25)_0%,_rgba(2,6,23,0.2)_45%,_#020617_100%)]" />
      <div className="relative flex min-h-svh flex-col">
        <SiteHeader
          lang={lang}
          theme={theme}
          t={t}
          onToggleLang={() => setLang((current) => (current === "en" ? "vi" : "en"))}
          onToggleTheme={() =>
            setTheme((current) => (current === "light" ? "dark" : "light"))
          }
          onOpenLogin={openLogin}
        />
        <HeroSection t={t} onOpenLogin={openLogin} />
        <DocumentsPage lang={lang} />
        <ToeicSection lang={lang} />
        <SiteFooter t={t} onOpenContact={openContact} />
      </div>

      <Suspense fallback={null}><ContactModal
        open={contactOpen}
        type={contactType}
        onClose={closeContact}
        lang={lang}
      /></Suspense>

      <Suspense fallback={null}><LoginModal open={loginOpen} onClose={closeLogin} lang={lang} /></Suspense>

      <Suspense fallback={null}><ToeicAnnouncementModal
        open={announcementOpen}
        lang={lang}
        onClose={closeAnnouncement}
        onDontShowToday={handleDontShowToday}
        onTryNow={handleTryNow}
        onFeedback={handleFeedback}
      /></Suspense>
    </div>
  )
}

function RouteLoading() {
  return <div className="mx-auto flex min-h-svh items-center justify-center px-6"><p className="lp-modal-desc text-[15px]">Loading…</p></div>
}

