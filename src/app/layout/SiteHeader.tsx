import { useEffect, useState, type ReactNode } from "react"
import { Languages, Menu, MessageCircle, Moon, Sun, X } from "lucide-react"
import { cn } from "@/lib/utils"
import brandLogo from "@/assets/logo.png"
import { GoogleIcon } from "@/shared/icons/GoogleIcon"
import { CommunityChatModal } from "@/components/CommunityChatModal"

type Lang = "en" | "vi"
type Theme = "light" | "dark"
type NavKey = "home" | "documents" | "features"

const navKeys: { key: NavKey; href: string }[] = [
  { key: "home", href: "#home" },
  { key: "documents", href: "#docs" },
  { key: "features", href: "#features" },
]

function HeaderIconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[var(--shadow-1)] transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10",
        className
      )}
    >
      {children}
    </button>
  )
}

export function SiteHeader({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onOpenLogin,
  t,
}: {
  lang: Lang
  theme: Theme
  onToggleLang: () => void
  onToggleTheme: () => void
  onOpenLogin: () => void
  t: Record<string, string>
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuState, setMenuState] = useState<"open" | "closed">("closed")
  const [activeNav, setActiveNav] = useState<NavKey>("home")
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const resolveActive = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash === "docs" || hash === "documents") {
        setActiveNav("documents")
        return
      }
      if (hash === "features") {
        setActiveNav("features")
        return
      }
      if (hash === "home" || hash === "") {
      }

      const headerOffset = 96
      const docsEl = document.getElementById("docs")
      const featuresEl = document.getElementById("features")
      const homeEl = document.getElementById("home")

      const docsTop = docsEl?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
      const featuresTop = featuresEl?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
      const homeTop = homeEl?.getBoundingClientRect().top ?? 0

      if (featuresEl && featuresTop - headerOffset <= 0) {
        setActiveNav("features")
        return
      }
      if (docsEl && docsTop - headerOffset <= 0) {
        setActiveNav("documents")
        return
      }
      if (homeEl && homeTop - headerOffset <= 120) {
        setActiveNav("home")
        return
      }
      setActiveNav("home")
    }

    resolveActive()
    window.addEventListener("scroll", resolveActive, { passive: true })
    window.addEventListener("hashchange", resolveActive)
    return () => {
      window.removeEventListener("scroll", resolveActive)
      window.removeEventListener("hashchange", resolveActive)
    }
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      setMenuVisible(true)
      setMenuState("open")
      return
    }

    if (!menuVisible) return

    setMenuState("closed")
    const timer = window.setTimeout(() => {
      setMenuVisible(false)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [mobileOpen, menuVisible])

  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-slate-50/95 shadow-[var(--shadow-1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[var(--shadow-2)] supports-[backdrop-filter]:bg-slate-50/80 dark:supports-[backdrop-filter]:bg-slate-950/80">
      <div className="relative mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-6 py-[18px] lg:px-8">
        {/* Mobile: hamburger left */}
        <button
          type="button"
          className={cn(
            "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[var(--shadow-1)] transition-all duration-200 md:hidden dark:border-white/10 dark:bg-slate-900 dark:text-slate-200",
            "active:scale-95",
            mobileOpen
              ? "border-primary-600 bg-primary-600 text-white shadow-none dark:border-white dark:bg-white dark:text-slate-900"
              : "hover:border-slate-300 hover:bg-slate-50 dark:hover:border-white/20 dark:hover:bg-slate-800"
          )}
          aria-label={mobileOpen ? t.closeMenu : t.openMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="relative h-5 w-5">
            <Menu
              className={cn(
                "absolute inset-0 h-5 w-5 transition-all duration-250 ease-out",
                mobileOpen ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
              )}
              strokeWidth={2.25}
            />
            <X
              className={cn(
                "absolute inset-0 h-5 w-5 transition-all duration-250 ease-out",
                mobileOpen ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"
              )}
              strokeWidth={2.25}
            />
          </span>
        </button>

        <a
          href="/"
          className="absolute left-1/2 inline-flex -translate-x-1/2 items-center md:static md:translate-x-0"
          aria-label={t.brand.replace(".", "")}
        >
          <img
            src={brandLogo}
            alt={t.brand.replace(".", "")}
            className="h-[31px] w-auto object-contain sm:h-[35px]"
          />
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex">
          {navKeys.map((item) => {
            const isActive = activeNav === item.key
            return (
              <a
                key={item.key}
                href={item.href}
                onClick={() => setActiveNav(item.key)}
                className={cn(
                  "relative pb-1 text-[15px] font-bold transition-colors",
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                {t[item.key]}
                {isActive ? (
                  <span className="absolute inset-x-0 -bottom-[2px] h-[2px] rounded-full bg-primary-600 dark:bg-white" />
                ) : null}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <HeaderIconButton
              label={lang === "en" ? t.switchToVi : t.switchToEn}
              onClick={onToggleLang}
            >
              <span className="relative inline-flex h-4 w-4 items-center justify-center">
                <Languages className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="absolute -bottom-1 -right-1 rounded bg-primary-600 px-1 text-[7px] font-bold leading-none text-white dark:bg-white dark:text-slate-900">
                  {lang.toUpperCase()}
                </span>
              </span>
            </HeaderIconButton>

            <HeaderIconButton
              label={theme === "light" ? t.switchToDark : t.switchToLight}
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
            </HeaderIconButton>
          </div>

          <HeaderIconButton
            label={t.communityChat ?? (lang === "vi" ? "Chat cộng đồng" : "Community Chat")}
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          </HeaderIconButton>
        </div>
      </div>

      {menuVisible ? (
        <>
          <button
            type="button"
            aria-label={t.closeMenu}
            data-state={menuState}
            className="mobile-menu-overlay fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] md:hidden dark:bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            data-state={menuState}
            className="mobile-menu-panel absolute left-6 right-6 top-[calc(100%-4px)] z-50 overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_4px_0_#DCDCDC] md:hidden dark:border-white/10 dark:bg-slate-900"
          >
            <ul className="space-y-3">
              {navKeys.map((item) => {
                const isActive = activeNav === item.key
                return (
                  <li key={item.key} className="mobile-menu-item">
                    <a
                      href={item.href}
                      className={cn(
                        "lp-btn lp-btn--sm lp-btn--block w-full min-w-0",
                        isActive ? "lp-btn--primary" : "lp-btn--secondary"
                      )}
                      onClick={() => {
                        setActiveNav(item.key)
                        setMobileOpen(false)
                      }}
                    >
                      {t[item.key]}
                    </a>
                  </li>
                )
              })}
              <li className="mobile-menu-item">
                <button
                  type="button"
                  className="lp-btn lp-btn--secondary lp-btn--sm lp-btn--block w-full min-w-0"
                  onClick={() => {
                    setMobileOpen(false)
                    onOpenLogin()
                  }}
                >
                  <GoogleIcon className="h-5 w-5 shrink-0" />
                  {t.loginGoogle}
                </button>
              </li>
              <li className="mobile-menu-item">
                <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1CB0F6] shadow-[0_2px_0_#E5E5E5] dark:bg-slate-800 dark:text-white dark:shadow-none border border-slate-200 dark:border-white/10">
                      <Languages className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="text-left">
                      <p className="text-[13px] font-extrabold leading-none text-[#100F3E] dark:text-white">
                        {lang === "vi" ? "Tiếng Việt" : "English"}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-none text-slate-500 dark:text-slate-400">
                        {lang === "vi" ? "Đổi ngôn ngữ" : "Switch language"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={lang === "en"}
                    aria-label={lang === "en" ? t.switchToVi : t.switchToEn}
                    onClick={onToggleLang}
                    className={cn(
                      "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200",
                      lang === "en" ? "bg-[#1CB0F6]" : "bg-[#1CB0F6]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200",
                        lang === "en" ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                    <span className="absolute inset-0 flex items-center justify-between px-1.5 text-[8px] font-extrabold leading-none text-white/90">
                      <span className={cn(lang === "vi" ? "opacity-100" : "opacity-0")}>VI</span>
                      <span className={cn(lang === "en" ? "opacity-100" : "opacity-0")}>EN</span>
                    </span>
                  </button>
                </div>
              </li>
              <li className="mobile-menu-item">
                <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 shadow-[0_2px_0_#E5E5E5] dark:bg-slate-800 dark:text-amber-400 dark:shadow-none border border-slate-200 dark:border-white/10">
                      {theme === "light" ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />}
                    </span>
                    <div className="text-left">
                      <p className="text-[13px] font-extrabold leading-none text-[#100F3E] dark:text-white">
                        {theme === "light" ? (lang === "vi" ? "Giao diện Sáng" : "Light mode") : (lang === "vi" ? "Giao diện Tối" : "Dark mode")}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-none text-slate-500 dark:text-slate-400">
                        {lang === "vi" ? "Chuyển giao diện" : "Switch theme"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === "dark"}
                    aria-label={theme === "light" ? t.switchToDark : t.switchToLight}
                    onClick={onToggleTheme}
                    className={cn(
                      "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200",
                      theme === "dark" ? "bg-[#1CB0F6]" : "bg-slate-300 dark:bg-slate-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200",
                        theme === "dark" ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </>
      ) : null}
      </header>
      <CommunityChatModal open={chatOpen} onClose={() => setChatOpen(false)} lang={lang} />
    </>
  )
}
