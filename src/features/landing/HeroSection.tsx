import { GoogleIcon } from "@/shared/icons/GoogleIcon"
import type { Theme } from "@/shared/types/app"

function QuizPreviewCard({ theme }: { theme: Theme }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute -inset-x-4 bottom-0 top-12 rounded-xl bg-primary-100/35 blur-2xl dark:bg-sky-500/10" />
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-6 pb-7 pt-5 shadow-[var(--shadow-2)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[var(--shadow-2)] sm:px-7 sm:pb-8 sm:pt-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="min-w-0 truncate text-[11px] font-medium tracking-wide text-slate-400 sm:text-[13px]">
            quizpka.online
          </span>
          <span className="text-[13px] font-medium tabular-nums tracking-wide text-slate-400">
            00:31:07
          </span>
        </div>

        <video
          className="mt-2 w-full max-h-[340px] rounded-lg object-contain"
          src={theme === "dark" ? "/animo-column-drift-720p-dark.webm" : "/animo-column-drift-720p.webm"}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          disablePictureInPicture
        />
      </div>
    </div>
  )
}

export function HeroSection({ t, onOpenLogin, theme }: { t: Record<string, string>; onOpenLogin: () => void; theme: Theme }) {
  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100svh-76px)] w-full flex-col justify-center md:min-h-[calc(100svh-76px)]"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col justify-center px-6 py-10 sm:py-12 md:py-0 lg:px-8">
        <div className="lp-eyebrow-wrap">
          <div className="lp-eyebrow lp-eyebrow-blue">
            <span>{t.eyebrowBadge}</span>
            <span>{t.eyebrowText}</span>
          </div>
        </div>
        <div className="grid w-full items-center gap-10 sm:gap-12 md:gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
          <div className="mx-auto w-full max-w-[620px] lg:mx-0">
            <h1 className="lp-heading">
              {t.heroTitleLine1}
              <br />
              {t.heroTitleLine2}{" "}
              <span className="name-logo">{t.brand}</span>
            </h1>

            <p className="lp-subheading mt-2">
              {t.heroDesc}
            </p>

            <div className="lp-cta-row mt-9">
              <button type="button" className="lp-btn lp-btn--primary" onClick={onOpenLogin}>
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/15">
                  <GoogleIcon className="h-[18px] w-[18px]" />
                </span>
                {t.loginGoogle}
              </button>
              <button
                type="button"
                className="lp-btn lp-btn--secondary"
                onClick={() => {
                  document.getElementById("docs")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              >
                {t.explore}
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
            {t.freeNote2 ? (
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
            <QuizPreviewCard theme={theme} />
          </div>
        </div>
      </div>
    </section>
  )
}
