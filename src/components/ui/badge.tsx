import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-full px-3 text-[12px] font-medium leading-none",
  {
    variants: {
      variant: {
        default: "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300",
        secondary: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
        error: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
        outline: "border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-transparent dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
