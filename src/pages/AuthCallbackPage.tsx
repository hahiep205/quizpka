import { useEffect, useMemo } from "react"
import { appRoutes, navigate } from "@/app/navigation"
import { useAuth } from "@/auth/AuthProvider"

export function AuthCallbackPage() {
  const { status } = useAuth()
  const providerError = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("error_description") ?? params.get("error")
  }, [])

  useEffect(() => {
    if (status === "authenticated") navigate(appRoutes.dashboard, { replace: true })
  }, [status])

  const error = providerError ?? (status === "anonymous" ? "Không thể hoàn tất đăng nhập. Vui lòng thử lại." : null)
  return <main className="mx-auto flex min-h-svh items-center justify-center px-6"><p role={error ? "alert" : undefined}>{error ?? "Đang hoàn tất đăng nhập…"}</p></main>
}
