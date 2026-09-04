import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export const dashboardStatGridClass =
  "grid grid-cols-2 overflow-hidden rounded-[20px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] dark:bg-[#242526] dark:ring-white/10 sm:gap-3 sm:overflow-visible sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0 lg:grid-cols-4 lg:gap-4"

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
        "flex items-center gap-3 px-3.5 py-3.5 max-sm:border-[#E4E6EB] dark:max-sm:border-white/10",
        "max-sm:odd:border-r max-sm:[&:nth-child(-n+2)]:border-b",
        "sm:gap-4 sm:rounded-[16px] sm:border-2 sm:border-[#E5E5E5] sm:bg-white sm:p-4 sm:shadow-[0_4px_0_#DCDCDC]",
        "dark:sm:border-white/10 dark:sm:bg-slate-900 dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]",
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 sm:rounded-[12px]", tones[tone])}>
        <Icon className="h-[18px] w-[18px] sm:h-6 sm:w-6" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black tracking-[-0.02em] text-[#100F3E] dark:text-white sm:text-xl">
          {value}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">
          {label}
        </p>
      </div>
    </div>
  )
}
