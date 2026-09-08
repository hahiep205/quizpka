import { appRoutes, navigate } from "@/app/navigation"

export function SiteFooter({
  t,
}: {
  t: Record<string, string>
}) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
        <p className="order-2 text-center text-[13px] font-medium leading-5 text-slate-500 sm:order-1 sm:text-left">
          {t.copyright}
        </p>

        <nav
          aria-label="Footer"
          className="order-1 flex flex-col items-center justify-center gap-1 sm:order-2 sm:flex-row sm:gap-x-1"
        >
          <a
            href={appRoutes.policy}
            onClick={(event) => {
              event.preventDefault()
              navigate(appRoutes.policy)
            }}
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium leading-5 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            {t.terms}
          </a>
          <span
            aria-hidden="true"
            className="hidden h-1 w-1 rounded-full bg-[#c7cedb] sm:block dark:bg-white/25"
          />
          <a
            href="mailto:quizpka@gmail.com"
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium leading-5 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Email: quizpka@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  )
}
