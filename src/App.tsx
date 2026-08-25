import { useEffect, useMemo, useState } from "react"
import { ContactModal, type ContactModalType } from "@/components/ContactModal"
import { LoginModal } from "@/components/LoginModal"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { PracticeGuestPage } from "@/pages/PracticeGuestPage"
import { appTranslations as translations } from "@/shared/i18n"
import { useGlobalSecurity } from "@/hooks/useGlobalSecurity"
import { SecurityOverlay } from "@/security/SecurityOverlay"
import { SiteHeader } from "@/app/layout/SiteHeader"
import { HeroSection } from "@/features/landing/HeroSection"
import { SiteFooter } from "@/app/layout/SiteFooter"

type Lang = "en" | "vi"
type Theme = "light" | "dark"

function getPathname() {
  if (typeof window === "undefined") return "/"
  return window.location.pathname.replace(/\/+$/, "") || "/"
}

export default function App() {
  const [pathname, setPathname] = useState(getPathname)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactType, setContactType] = useState<ContactModalType | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("quizpka-lang")
    return saved === "vi" || saved === "en" ? saved : "vi"
  })
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("quizpka-theme")
    if (saved === "light" || saved === "dark") return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
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

  useEffect(() => {
    const onPopState = () => setPathname(getPathname())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

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

  const shellClassName =
    "relative min-h-svh bg-slate-50 transition-colors duration-300 dark:bg-slate-950"

  if (pathname === "/practice4guest") {
    return (
      <div className={shellClassName}>
        {locked && <SecurityOverlay onClose={() => setLocked(false)} />}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_rgba(248,250,252,0.55)_45%,_#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(30,58,138,0.25)_0%,_rgba(2,6,23,0.2)_45%,_#020617_100%)]" />
        <PracticeGuestPage lang={lang} />
      </div>
    )
  }

  if (pathname === "/dashboard") {
    return (
      <>
        {locked && <SecurityOverlay onClose={() => setLocked(false)} />}
        <DashboardPage
          lang={lang}
          theme={theme}
          onToggleLang={() => setLang((current) => (current === "en" ? "vi" : "en"))}
          onToggleTheme={() =>
            setTheme((current) => (current === "light" ? "dark" : "light"))
          }
        />
      </>
    )
  }

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
        <SiteFooter t={t} onOpenContact={openContact} />
      </div>

      <ContactModal
        open={contactOpen}
        type={contactType}
        onClose={closeContact}
        lang={lang}
      />

      <LoginModal open={loginOpen} onClose={closeLogin} lang={lang} />
    </div>
  )
}

