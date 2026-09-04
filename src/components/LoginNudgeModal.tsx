import { useCallback, useRef, useState } from "react"
import { History, LogIn, RotateCcw, Trophy, X, Zap } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { loginNudgeCopy as copy } from "@/shared/i18n"
import { GoogleIcon } from "@/shared/icons/GoogleIcon"
import { useAuth } from "@/auth/AuthProvider"
import { cn, modalBodyClass, modalFooterClass, modalFrameClass, modalHeaderClass } from "@/lib/utils"

type Lang = "en" | "vi"

const BENEFIT_ICONS = [History, RotateCcw, Trophy, Zap] as const

/**
 * Chặn hành động "Thử ngay" của khách để mời login trước.
 * - Đã login (hoặc đang loading session): chạy action luôn, không hiện modal.
 * - Khách: mở modal, "Bỏ qua" thì chạy tiếp như khách, "Đăng nhập ngay" đi OAuth.
 */
export function useLoginNudge() {
  const { status } = useAuth()
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const pendingRef = useRef<(() => void) | null>(null)

  const requestNudge = useCallback((action: () => void) => {
    if (status !== "anonymous") {
      action()
      return
    }
    pendingRef.current = action
    setNudgeOpen(true)
  }, [status])

  const skipNudge = useCallback(() => {
    setNudgeOpen(false)
    const action = pendingRef.current
    pendingRef.current = null
    action?.()
  }, [])

  const closeNudge = useCallback(() => {
    setNudgeOpen(false)
    pendingRef.current = null
  }, [])

  return { nudgeOpen, requestNudge, skipNudge, closeNudge }
}

export function LoginNudgeModal({
  open,
  lang = "vi",
  onSkip,
  onClose,
}: {
  open: boolean
  lang?: Lang
  onSkip: () => void
  onClose: () => void
}) {
  const t = copy[lang]
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = () => {
    setLoading(true)
    setError(null)
    void signInWithGoogle().catch(() => {
      setLoading(false)
      setError(t.error)
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.title}
      closeLabel={t.close}
      className="z-[100]"
      panelClassName={cn("max-w-[480px] rounded-[18px] border-2 border-[#E5E5E5] bg-white shadow-[0_6px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none", modalFrameClass)}
    >
      <div className={modalHeaderClass}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
            <LogIn className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="lp-modal-title text-[18px] sm:text-[20px]">{t.title}</h2>
            <p className="lp-modal-desc mt-0.5 line-clamp-2 text-[13px]">{t.subtitle}</p>
          </div>
        </div>
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label={t.close}>
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className={cn(modalBodyClass, "space-y-2.5")}>
        {t.benefits.map((b, i) => {
          const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length] ?? History
          return (
            <div key={b.title} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-white/5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-[#1CB0F6] shadow-sm dark:bg-slate-800">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#100F3E] dark:text-white">{b.title}</p>
                <p className="truncate text-xs font-semibold text-slate-400">{b.desc}</p>
              </div>
            </div>
          )
        })}
        {error ? <p role="alert" className="text-center text-sm font-semibold text-red-600">{error}</p> : null}
      </div>

      <div className={cn(modalFooterClass, "[&>button]:flex-1 sm:[&>button]:flex-none")}>
        <button
          type="button"
          className="lp-btn lp-btn--secondary lp-btn--sm"
          onClick={onSkip}
          disabled={loading}
        >
          {t.skip}
        </button>
        <button
          type="button"
          className="lp-btn lp-btn--primary lp-btn--sm"
          onClick={handleLogin}
          disabled={loading}
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          {loading ? t.signingIn : t.signIn}
        </button>
      </div>
    </Dialog>
  )
}
