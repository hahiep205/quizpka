import { useEffect, useRef, useState } from "react"
import { appRoutes, navigate } from "@/app/navigation"
import { useAuth } from "@/auth/AuthProvider"
import { R2_PUBLIC_ASSET_BASE, R2_PUBLIC_ORIGIN } from "@/lib/mediaUrl"

export function WelcomeNewUserPage() {
  const { status, profile, completeWelcome } = useAuth()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "anonymous") navigate(appRoutes.home, { replace: true })
    if (status === "authenticated" && profile?.welcome_completed !== false) {
      navigate(appRoutes.dashboard, { replace: true })
    }
  }, [status, profile?.welcome_completed])

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== R2_PUBLIC_ORIGIN || event.source !== frameRef.current?.contentWindow) return
      if (typeof event.data !== "object" || event.data === null || (event.data as { type?: unknown }).type !== "quizpka-welcome-complete") return

      setSaving(true)
      setError(null)
      void completeWelcome()
        .then(() => navigate(appRoutes.dashboard, { replace: true }))
        .catch(() => {
          setError("Không thể lưu trạng thái lúc này. Vui lòng thử lại.")
          setSaving(false)
        })
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [completeWelcome])

  if (status !== "authenticated" || profile?.welcome_completed !== false) {
    return <main className="flex min-h-svh items-center justify-center px-6">Đang tải…</main>
  }

  return (
    <main className="relative min-h-svh">
      <iframe
        ref={frameRef}
        title="Chào mừng đến với QuizPKA"
        src={`${R2_PUBLIC_ASSET_BASE}/welcome-new-user.html`}
        className="absolute inset-0 h-full min-h-svh w-full border-0"
        aria-busy={saving}
      />
      {error ? <p role="alert" className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white">{error}</p> : null}
      {saving ? <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/70 text-sm font-bold text-slate-700">Đang lưu…</div> : null}
    </main>
  )
}
