import { useEffect, useMemo, useRef, useState } from "react"
import { appRoutes, navigate } from "@/app/navigation"
import { useAuth } from "@/auth/AuthProvider"

const BLOCKED_AUTO_SIGN_OUT_SECONDS = 10

export function AuthCallbackPage() {
  const { status, profile, signOut } = useAuth()
  const [countdown, setCountdown] = useState(BLOCKED_AUTO_SIGN_OUT_SECONDS)
  const signOutRef = useRef(signOut)
  signOutRef.current = signOut
  const providerError = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("error_description") ?? params.get("error")
  }, [])

  useEffect(() => {
    if (status === "authenticated") navigate(appRoutes.dashboard, { replace: true })
  }, [status])

  const isBlocked = status === "blocked"
  useEffect(() => {
    if (!isBlocked) return
    if (countdown <= 0) { void signOutRef.current().then(() => navigate(appRoutes.home, { replace: true })); return }
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [isBlocked, countdown])

  const blockedReason = profile?.blocked_reason?.trim() ? profile.blocked_reason : null
  const error = providerError ?? (status === "anonymous" ? "Không thể hoàn tất đăng nhập. Vui lòng thử lại." : status === "blocked" ? (blockedReason ? `Tài khoản đã bị khóa. Lý do: ${blockedReason}` : "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.") : null)
  return <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-3 px-6 text-center"><p role={error ? "alert" : undefined}>{error ?? "Đang hoàn tất đăng nhập…"}</p>{isBlocked ? <p role="status" className="text-sm font-semibold text-slate-400">Tự động đăng xuất sau {countdown} giây…</p> : null}</main>
}
