import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10",
        active: "bg-primary-600 text-white shadow-[var(--shadow-1)]",
        muted: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  active?: boolean
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, active, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        chipVariants({ variant: active ? "active" : variant }),
        className
      )}
      {...props}
    />
  )
)
Chip.displayName = "Chip"

export { Chip, chipVariants }
