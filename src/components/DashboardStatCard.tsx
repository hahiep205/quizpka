import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

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
    <div className="flex min-h-[106px] flex-col justify-between rounded-[14px] border-2 border-[#E5E5E5] bg-white p-3.5 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:min-h-0 sm:flex-row sm:items-center sm:gap-4 sm:rounded-[16px] sm:p-4 sm:shadow-[0_4px_0_#DCDCDC] dark:sm:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] sm:h-12 sm:w-12 sm:rounded-[12px]", tones[tone])}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
      </div>
      <div className="mt-2.5 min-w-0 sm:mt-0 sm:flex-1">
        <p className="text-lg font-black tracking-[-0.02em] text-[#100F3E] dark:text-white sm:text-xl">{value}</p>
        <p className="mt-0.5 text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      </div>
    </div>
  )
}
