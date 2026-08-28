import * as React from "react"
import { cn } from "@/lib/utils"

export interface GradientBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Hiển thị 2 "quầng sáng" trang trí (xanh góc trên-phải, vàng góc dưới-trái).
   * Mặc định: true.
   */
  showBlobs?: boolean
}

/**
 * Lớp nền gradient tái sử dụng (absolute inset-0).
 *
 * Light mode: xanh nhạt #E8F7FE -> trắng -> vàng kem nhạt #FFF8E1 (chéo từ
 * trên-trái xuống dưới-phải).
 * Dark mode: sky-500/10 -> slate-900 -> amber-500/10.
 *
 * Cách dùng: đặt bên trong parent có `relative` + `overflow-hidden`
 * (ví dụ Card), phần nội dung phía trên cần có `relative`/`z-10` để nằm
 * trên lớp nền.
 *
 * @example
 * <Card className="relative overflow-hidden">
 *   <GradientBackground />
 *   <div className="relative">...</div>
 * </Card>
 */
function GradientBackground({
  className,
  showBlobs = true,
  ...props
}: GradientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8F7FE] via-white to-[#FFF8E1] dark:from-sky-500/10 dark:via-slate-900 dark:to-amber-500/10" />
      {showBlobs ? (
        <>
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#1CB0F6]/10 blur-2xl dark:bg-sky-500/20" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-[#FFD000]/15 blur-2xl dark:bg-amber-500/15" />
        </>
      ) : null}
    </div>
  )
}

export { GradientBackground }
