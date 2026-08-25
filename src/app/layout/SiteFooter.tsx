import type { ContactModalType } from "@/components/ContactModal"

const footerKeys: { key: "contribute" | "support"; type: ContactModalType }[] = [
  { key: "contribute", type: "Contribute" },
  { key: "support", type: "Support" },
]

export function SiteFooter({
  t,
  onOpenContact,
}: {
  t: Record<string, string>
  onOpenContact: (type: ContactModalType) => void
}) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-5">
        <p className="order-2 text-center text-[13px] font-medium leading-5 text-slate-500 sm:order-1 sm:text-left">
          {t.copyright}
        </p>

        <nav
          aria-label="Footer"
          className="order-1 flex w-full max-w-[320px] items-center justify-center gap-2 sm:order-2 sm:w-auto sm:max-w-none sm:justify-end sm:gap-x-1"
        >
          {footerKeys.map((link, index) => (
            <div
              key={link.key}
              className="flex min-w-0 flex-1 items-center sm:flex-none"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="mx-2 hidden h-1 w-1 rounded-full bg-[#c7cedb] sm:inline-block dark:bg-white/25"
                />
              ) : null}
              <button
                type="button"
                onClick={() => onOpenContact(link.type)}
                className="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-center text-[13px] font-medium leading-5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:w-auto sm:rounded-lg sm:bg-transparent sm:px-2.5 sm:py-1.5 sm:hover:bg-slate-50 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:dark:hover:bg-white/10"
              >
                {t[link.key]}
              </button>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  )
}
