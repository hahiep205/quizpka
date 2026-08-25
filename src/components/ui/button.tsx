import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary-600 text-white shadow-[var(--shadow-1)] hover:-translate-y-px hover:bg-primary-700",
        outline:
          "border border-slate-200 bg-white text-slate-900 shadow-[var(--shadow-1)] hover:-translate-y-px hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        destructive: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        default: "h-11 min-h-11 px-4 py-3",
        sm: "h-9 min-h-9 rounded-xl px-3 text-[13px]",
        lg: "h-12 min-h-12 rounded-xl px-5 text-[15px]",
        icon: "h-11 w-11 min-h-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
