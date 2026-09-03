import { useEffect, useState } from "react"
import { appRoutes, navigate } from "@/app/navigation"
import { supabase } from "@/lib/supabase"

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")
    void (async () => {
      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        if (result.error) { setError(result.error.message); return }
      }
      navigate(appRoutes.dashboard, { replace: true })
    })().catch((callbackError: unknown) => {
      setError(callbackError instanceof Error ? callbackError.message : "Không thể hoàn tất đăng nhập.")
    })
  }, [])
  return <main className="mx-auto flex min-h-svh items-center justify-center px-6"><p role={error ? "alert" : undefined}>{error ?? "Đang hoàn tất đăng nhập…"}</p></main>
}
