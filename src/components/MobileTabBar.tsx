import { useLayoutEffect, useRef, useState, type ComponentType } from "react"
import { cn } from "@/lib/utils"

export type MobileTabItem<K extends string> = {
  key: K
  icon: ComponentType<{ className?: string }>
  label: string
  badge?: number
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
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<K, HTMLButtonElement>())
  const [indicator, setIndicator] = useState({ left: 0, width: 68, ready: false })

  // Đo vị trí ô icon đang active để viên pill trượt tới đúng chỗ.
  useLayoutEffect(() => {
    const update = () => {
      const container = containerRef.current
      const button = buttonRefs.current.get(activeKey)
      if (!container || !button) return
      const containerRect = container.getBoundingClientRect()
      const target = button.querySelector("span")?.getBoundingClientRect() ?? button.getBoundingClientRect()
      setIndicator({
        left: target.left - containerRect.left,
        width: target.width,
        ready: true,
      })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activeKey, items.length])

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] px-4 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden"
      aria-label={ariaLabel}
    >
      <div
        ref={containerRef}
        className="pointer-events-auto relative mx-auto flex h-[54px] max-w-[430px] items-center rounded-full bg-white/90 px-2 shadow-[0_12px_32px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] backdrop-blur-2xl dark:bg-[#2C2C2E]/90 dark:ring-white/12"
      >
        {/* Viên pill trượt mượt theo tab active */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-[42px] -translate-y-1/2 rounded-[20px] bg-[#EBF4FE] transition-[left,width] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] dark:bg-[#1CB0F6]/20"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              ref={(element) => {
                if (element) buttonRefs.current.set(item.key, element)
                else buttonRefs.current.delete(item.key)
              }}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onClick={() => onNavigate(item.key)}
              className="relative flex min-w-0 flex-1 items-center justify-center [-webkit-tap-highlight-color:transparent] select-none"
            >
              <span
                className={cn(
                  "flex h-[42px] w-[68px] items-center justify-center rounded-[20px] transition-[transform,color] duration-200 ease-out active:scale-95",
                  isActive
                    ? "text-[#1CB0F6] dark:text-[#4C9AFF]"
                    : "bg-transparent text-[#131313] dark:text-[#F2F2F7]",
                )}
              >
                <Icon
                  className="h-[21px] w-[21px]"
                />
              </span>
              {item.badge ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-5 text-white ring-2 ring-white dark:ring-[#2C2C2E]">{item.badge > 99 ? "99+" : item.badge}</span> : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
