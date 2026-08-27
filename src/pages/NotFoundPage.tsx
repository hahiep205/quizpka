import { navigate, appRoutes } from "@/app/navigation"
import type { Language } from "@/shared/types/app"

const copy = {
  en: { title: "Page not found", description: "The page you requested does not exist.", action: "Back to home" },
  vi: { title: "Không tìm thấy trang", description: "Trang bạn yêu cầu không tồn tại.", action: "Về trang chủ" },
} as const

export function NotFoundPage({ lang }: { lang: Language }) {
  const t = copy[lang]
  return <div className="mx-auto flex min-h-svh max-w-[520px] flex-col items-center justify-center px-6 text-center"><h1 className="lp-modal-title text-[24px]">{t.title}</h1><p className="lp-modal-desc mt-3">{t.description}</p><button type="button" className="lp-btn lp-btn--primary lp-btn--sm mt-6" onClick={() => navigate(appRoutes.home)}>{t.action}</button></div>
}
