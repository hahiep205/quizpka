import { X } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { loginCopy as copy } from "@/shared/i18n"
import { GoogleIcon } from "@/shared/icons/GoogleIcon"
import { useAuth } from "@/auth/AuthProvider"
import { useState } from "react"

type LoginModalProps = {
  open: boolean
  onClose: () => void
  lang?: "en" | "vi"
}



export function LoginModal({ open, onClose, lang = "vi" }: LoginModalProps) {
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
    <Dialog open={open} onClose={onClose} title={t.title} closeLabel={t.close} panelClassName="w-full max-w-[440px] overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[var(--shadow-3)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <h2 className="lp-modal-title">{t.title}</h2>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon" onClick={onClose} aria-label={t.close}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="lp-modal-desc py-3 text-center text-[15px]">
            {t.note}
          </p>

          {error && <p role="alert" className="text-center text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={handleLogin} disabled={loading}>
              <GoogleIcon className="h-4 w-4" />
              {loading ? t.signingIn : t.signIn}
            </button>
            <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={onClose}>
              {t.cancel}
            </button>
          </div>
        </div>
    </Dialog>
  )
}
