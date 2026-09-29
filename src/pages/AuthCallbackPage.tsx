import { useEffect, useMemo } from "react"
import { appRoutes, navigate } from "@/app/navigation"
import { useAuth } from "@/auth/AuthProvider"

export function AuthCallbackPage() {
  const { status, profile } = useAuth()
  const providerError = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("error_description") ?? params.get("error")
  }, [])

  useEffect(() => {
    if (status === "authenticated") navigate(appRoutes.dashboard, { replace: true })
  }, [status])

  const blockedReason = profile?.blocked_reason?.trim() ? profile.blocked_reason : null
  const error = providerError ?? (status === "anonymous" ? "Không thể hoàn tất đăng nhập. Vui lòng thử lại." : status === "blocked" ? (blockedReason ? `Tài khoản đã bị khóa. Lý do: ${blockedReason}` : "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.") : null)
  return <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-3 px-6 text-center"><p role={error ? "alert" : undefined}>{error ?? "Đang hoàn tất đăng nhập…"}</p></main>
}
