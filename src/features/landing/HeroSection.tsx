import { useEffect, useRef } from "react"
import { GoogleIcon } from "@/shared/icons/GoogleIcon"
import { R2_PUBLIC_ASSET_BASE, R2_PUBLIC_ORIGIN } from "@/lib/mediaUrl"

function QuizPreviewCard() {
  const frameRef = useRef<HTMLIFrameElement>(null)

  // The R2-hosted iframe is cross-origin, so synchronize its background with postMessage.
  useEffect(() => {
    const frame = frameRef.current
    const syncTheme = () => {
      frame?.contentWindow?.postMessage({
        type: "quizpka-theme",
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      }, R2_PUBLIC_ORIGIN)
    }
    syncTheme()
    frame?.addEventListener("load", syncTheme)
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => {
      observer.disconnect()
      frame?.removeEventListener("load", syncTheme)
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,606px)] scale-100 sm:max-w-[clamp(360px,30vw+300px,606px)] sm:scale-100 2xl:scale-[1.08]">
      <iframe
        ref={frameRef}
        title=""
        aria-hidden="true"
        tabIndex={-1}
        scrolling="no"
        frameBorder="0"
        loading="eager"
        src={`${R2_PUBLIC_ASSET_BASE}/hero-svg-2.html`}
        className="aspect-[404/340] w-full overflow-hidden rounded-[20px]"
      />
    </div>
  )
}

export function HeroSection({ t, onOpenLogin, onOpenDashboard, authenticated }: { t: Record<string, string>; onOpenLogin: () => void; onOpenDashboard: () => void; authenticated: boolean }) {
  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100svh-76px)] w-full flex-col justify-center md:min-h-[calc(100svh-76px)]"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col justify-center px-6 py-10 sm:py-12 md:py-0 lg:px-8 max-[479px]:px-4 2xl:max-w-[1200px]">
        <div className="lp-eyebrow-wrap">
          <div className="lp-eyebrow lp-eyebrow-blue">
            <span>{t.eyebrowBadge}</span>
            <span>{t.eyebrowText}</span>
          </div>
        </div>
        <div className="grid w-full items-center gap-10 sm:gap-12 md:gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 max-[479px]:gap-8">
          <div className="mx-auto w-full max-w-[620px] lg:mx-0 min-w-0">
            <h1 className="lp-heading">
              {t.heroTitleLine1}
              <br />
              {t.heroTitleLine2}{" "}
              <span className="name-logo">{t.brand}</span>
            </h1>

            <p className="lp-subheading mt-2">
              {t.heroDesc}
            </p>

            <div className="lp-cta-row mt-9 max-[479px]:flex-col max-[479px]:items-stretch">
              <button type="button" className="lp-btn lp-btn--primary max-[479px]:w-full" onClick={authenticated ? onOpenDashboard : onOpenLogin}>
                {!authenticated && <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/15"><GoogleIcon className="h-[18px] w-[18px]" /></span>}
                {authenticated ? t.dashboardAccess : t.loginGoogle}
              </button>
              <button
                type="button"
                className="lp-btn lp-btn--secondary max-[479px]:w-full"
                onClick={() => {
                  document.getElementById("starts")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              >
                {authenticated ? t.quizNow : t.explore}
              </button>
            </div>

            <div className="lp-note mt-7 flex items-center gap-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                className="shrink-0 text-[#4b4b4b]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" />
                <path
                  d="M8 12.5L10.5 15L16 9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.freeNote}
            </div>
            {!authenticated && t.freeNote2 ? (
              <div className="lp-note mt-2 flex items-center gap-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  className="shrink-0 text-[#4b4b4b]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" />
                  <path
                    d="M8 12.5L10.5 15L16 9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t.freeNote2}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center lg:justify-end lg:pr-2">
            <QuizPreviewCard />
          </div>
        </div>
      </div>
    </section>
  )
}
