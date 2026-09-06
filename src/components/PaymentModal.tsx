import { useEffect, useId, useState } from "react"
import { Check, ExternalLink, LoaderCircle, RefreshCw, X } from "lucide-react"
import { hasDsaiPurchase } from "@/lib/purchases"
import { cn } from "@/lib/utils"

type Lang = "en" | "vi"

type PaymentModalProps = {
  open: boolean
  lang: Lang
  checkoutUrl: string | null
  fields: Record<string, string | number> | null
  userId?: string
  onClose: () => void
  onPaid: () => void
}

export function PaymentModal({ open, lang, checkoutUrl, fields, userId, onClose, onPaid }: PaymentModalProps) {
  const frameName = useId().replace(/:/g, "")
  const [paid, setPaid] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open || !checkoutUrl || !fields) return
    const form = document.createElement("form")
    form.method = "POST"
    form.action = checkoutUrl
    form.target = frameName
    form.style.display = "none"
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = name
      input.value = String(value)
      form.appendChild(input)
    })
    document.body.appendChild(form)
    form.submit()
    form.remove()
  }, [checkoutUrl, fields, frameName, open])

  useEffect(() => {
    if (!open || !userId) return
    let active = true
    const check = async () => {
      setChecking(true)
      try {
        if (active && await hasDsaiPurchase(userId)) {
          setPaid(true)
          onPaid()
        }
      } catch {
        if (active) setError(true)
      } finally {
        if (active) setChecking(false)
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [onPaid, open, userId])

  if (!open || !checkoutUrl || !fields) return null

  const isVietnamese = lang === "vi"
  const copy = isVietnamese
    ? {
        title: "Thanh toán",
        hint: "Quét mã QR và thanh toán trực tiếp trên cổng SePay.",
        cancel: "Hủy giao dịch",
        waiting: "Đang chờ xác nhận thanh toán…",
        success: "Thanh toán thành công!",
        check: "Tôi đã thanh toán",
        fallback: "Mở trang mới",
        retry: "Kiểm tra lại",
      }
    : {
        title: "Payment",
        hint: "Scan the QR code and pay directly through SePay.",
        cancel: "Cancel transaction",
        waiting: "Waiting for payment confirmation…",
        success: "Payment successful!",
        check: "I have paid",
        fallback: "Open new page",
        retry: "Check again",
      }

  const openInNewTab = () => {
    const form = document.createElement("form")
    form.method = "POST"
    form.action = checkoutUrl
    form.target = "_blank"
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = name
      input.value = String(value)
      form.appendChild(input)
    })
    document.body.appendChild(form)
    form.submit()
    form.remove()
  }

  const checkNow = async () => {
    if (!userId) return
    setChecking(true)
    setError(false)
    try {
      if (await hasDsaiPurchase(userId)) {
        setPaid(true)
        onPaid()
      }
    } catch {
      setError(true)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden p-2 sm:p-4">
      <button type="button" aria-label={copy.cancel} className="absolute inset-0 bg-[rgba(16,15,62,0.58)] backdrop-blur-sm" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-label={copy.title} className="relative z-10 flex max-h-[calc(100svh-16px)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-[0_8px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:max-h-[calc(100svh-32px)]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-6 text-[#100F3E] dark:text-white sm:text-xl">{copy.title}</h2>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">{copy.hint}</p>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label={copy.cancel}><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 bg-slate-50 p-2 sm:p-3 dark:bg-slate-950">
          <iframe name={frameName} title="SePay checkout" className="h-full min-h-[440px] w-full rounded-xl border border-slate-200 bg-white dark:border-white/10" />
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-white/10">
          <p className={cn("flex min-w-0 items-center gap-1.5 text-[11px] font-bold", paid ? "text-emerald-600" : "text-slate-500 dark:text-slate-400")}>
            {checking ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" /> : paid ? <Check className="h-3.5 w-3.5 shrink-0" /> : <RefreshCw className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{paid ? copy.success : error ? copy.retry : copy.waiting}</span>
          </p>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <button type="button" className={cn("lp-btn lp-btn--secondary lp-btn--sm min-w-0 px-2 text-[10px] sm:px-3 sm:text-xs", paid && "col-span-2")} onClick={openInNewTab}><ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{copy.fallback}</span></button>
            {!paid ? <button type="button" className="lp-btn lp-btn--primary lp-btn--sm min-w-0 px-2 text-[10px] sm:px-3 sm:text-xs" onClick={() => void checkNow()} disabled={checking}>{copy.check}</button> : null}
          </div>
        </footer>
      </section>
    </div>
  )
}
