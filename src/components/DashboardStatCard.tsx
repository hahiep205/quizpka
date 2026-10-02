import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export const dashboardStatGridClass =
  "grid min-w-0 grid-cols-1 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1CB0F6] via-[#1593d6] to-[#0B5ED7] text-white shadow-[0_4px_0_#0b6cb8] min-[380px]:grid-cols-2 dark:shadow-[0_4px_0_rgba(0,0,0,0.45)] sm:gap-3 sm:overflow-visible sm:rounded-none sm:bg-none sm:bg-transparent sm:text-inherit sm:shadow-none lg:grid-cols-4 lg:gap-4"

export function DashboardStatCard({
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
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 px-3 py-3 max-sm:border-white/15 min-[380px]:gap-3 min-[380px]:px-3.5 min-[380px]:py-3.5",
        "max-sm:border-b max-sm:last:border-b-0 min-[380px]:max-sm:odd:border-r min-[380px]:max-sm:[&:nth-child(-n+2)]:border-b min-[380px]:max-sm:[&:nth-child(n+3)]:border-b-0",
        "sm:gap-4 sm:rounded-[16px] sm:border-2 sm:border-[#E5E5E5] sm:bg-white sm:p-4 sm:shadow-[0_4px_0_#DCDCDC]",
        "dark:sm:border-white/10 dark:sm:bg-slate-900 dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]",
      )}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full max-sm:bg-white/15 max-sm:text-white min-[380px]:h-9 min-[380px]:w-9 sm:h-12 sm:w-12 sm:rounded-[12px] dark:max-sm:bg-white/15 dark:max-sm:text-white", tones[tone])}>
        <Icon className="h-[18px] w-[18px] sm:h-6 sm:w-6" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-base font-black tracking-[-0.02em] text-[#100F3E] max-sm:text-white min-[380px]:text-lg sm:text-xl dark:text-white">
          {value}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-500 max-sm:text-white/70 min-[380px]:text-[11px] sm:text-xs dark:text-slate-400 dark:max-sm:text-white/70">
          {label}
        </p>
      </div>
    </div>
  )
}
