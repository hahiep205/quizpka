import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MobileTabItem<K extends string> = {
  key: K
  icon: LucideIcon
  label: string
}

export function MobileTabBar<K extends string>({
  items,
  activeKey,
  onNavigate,
  ariaLabel,
}: {
  items: Array<MobileTabItem<K>>
  activeKey: K
  onNavigate: (key: K) => void
  ariaLabel: string
}) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] px-4 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden"
      aria-label={ariaLabel}
    >
      <div className="pointer-events-auto mx-auto flex h-[68px] max-w-[430px] items-center rounded-full bg-white/90 px-2 shadow-[0_12px_32px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] backdrop-blur-2xl dark:bg-[#2C2C2E]/90 dark:ring-white/12">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onClick={() => onNavigate(item.key)}
              className="flex min-w-0 flex-1 items-center justify-center [-webkit-tap-highlight-color:transparent] select-none"
            >
              <span
                className={cn(
                  "flex h-[52px] w-[52px] items-center justify-center rounded-[20px] transition-[background-color,transform,color] duration-200 ease-out active:scale-95",
                  isActive
                    ? "bg-[#EBF4FE] text-[#1CB0F6] dark:bg-[#1CB0F6]/20 dark:text-[#4C9AFF]"
                    : "bg-transparent text-[#131313] dark:text-[#F2F2F7]",
                )}
              >
                <Icon
                  className="h-[26px] w-[26px]"
                  strokeWidth={2}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
