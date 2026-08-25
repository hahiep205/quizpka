import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "border border-slate-200 bg-white text-slate-900 transition-all duration-200 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100",
  {
    variants: {
      variant: {
        default: "rounded-lg shadow-[var(--shadow-1)]",
        large: "rounded-xl shadow-[var(--shadow-1)]",
        interactive:
          "rounded-lg shadow-[var(--shadow-1)] hover:-translate-y-px hover:shadow-[var(--shadow-2)]",
        muted: "rounded-lg bg-slate-50 shadow-none dark:bg-white/5",
        dashed:
          "rounded-lg border-dashed bg-white/70 shadow-none dark:bg-slate-900/70",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5 flex items-start justify-between gap-3", className)} {...props} />
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[17px] font-bold leading-6 tracking-[-0.02em] text-slate-900 dark:text-white",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[13px] leading-5 text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex items-center gap-3", className)} {...props} />
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
}
