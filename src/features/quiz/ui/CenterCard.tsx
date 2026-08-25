import type { ReactNode } from "react"

export function CenterCard({ children }: { children: ReactNode }) {
  return (<div className="mx-auto flex w-full max-w-[720px] flex-1 items-center justify-center px-6 py-16"><div className="w-full rounded-[16px] border-2 border-[#E5E5E5] bg-white p-6 text-center shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-8">{children}</div></div>)
}
