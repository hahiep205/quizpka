import { useEffect, useRef, useState, type FormEvent } from "react"
import { appRoutes, navigate } from "@/app/navigation"
import { useAuth } from "@/auth/AuthProvider"
import { COHORT_OPTIONS, SCHOOL_OR_FACULTY_OPTIONS, type Cohort, type SchoolOrFaculty } from "@/auth/profilePreferences"
import { R2_PUBLIC_ASSET_BASE, R2_PUBLIC_ORIGIN } from "@/lib/mediaUrl"
import type { Language } from "@/shared/types/app"

const fieldClassName = "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-700 dark:focus:ring-sky-500/10"
const useNewWelcomeForm = import.meta.env.VITE_WELCOME_NEW_USER_FORM !== "false"

export function WelcomeNewUserPage() {
  const { status, profile, completeWelcome } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "")
  const [school, setSchool] = useState(profile?.school_or_faculty ?? "")
  const [cohort, setCohort] = useState(profile?.cohort ?? "")
  const [language, setLanguage] = useState<Language>(profile?.preferred_language ?? "vi")
  const [soundEnabled, setSoundEnabled] = useState(profile?.sound_enabled ?? true)
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(profile?.email_updates_enabled ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "anonymous") navigate(appRoutes.home, { replace: true })
    if (status === "authenticated" && profile?.welcome_completed !== false) {
      navigate(appRoutes.dashboard, { replace: true })
    }
  }, [status, profile?.welcome_completed])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await completeWelcome({
        display_name: displayName.trim() || null,
        school_or_faculty: (school || null) as SchoolOrFaculty | null,
        cohort: (cohort || null) as Cohort | null,
        preferred_language: language,
        sound_enabled: soundEnabled,
        email_updates_enabled: emailUpdatesEnabled,
      })
      navigate(appRoutes.dashboard, { replace: true })
    } catch {
      setError(language === "vi" ? "Không thể lưu thông tin lúc này. Vui lòng thử lại." : "Could not save your details. Please try again.")
      setSaving(false)
    }
  }

  if (status !== "authenticated" || profile?.welcome_completed !== false) {
    return <main className="flex min-h-svh items-center justify-center px-6">Đang tải…</main>
  }
  if (!useNewWelcomeForm) return <LegacyWelcomeFrame />

  const vi = language === "vi"
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 sm:py-12">
      <section className="w-full max-w-2xl rounded-2xl border-2 border-[#E5E5E5] bg-white p-5 shadow-[0_5px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_5px_0_rgba(0,0,0,0.35)] sm:rounded-[24px] sm:p-8">
        <header className="mb-7 text-center sm:mb-8">
          <h1 className="text-2xl font-black text-[#100F3E] dark:text-white sm:text-3xl">{vi ? <>Chào mừng bạn đến với <span className="name-logo">Quizpka</span></> : "Welcome!"}</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            {vi ? "Hoàn thiện hồ sơ để bắt đầu học ngay bây giờ." : "Complete your profile to start learning now."}
          </p>
        </header>

        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block min-w-0 text-sm font-extrabold text-slate-600 dark:text-slate-300 sm:col-span-2">
              {vi ? "Tên hiển thị" : "Display name"}
              <input autoComplete="name" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={fieldClassName} />
            </label>
            <label className="block min-w-0 text-sm font-extrabold text-slate-600 dark:text-slate-300">
              {vi ? "Trường/Khoa (không bắt buộc)" : "School/Faculty (optional)"}
              <select value={school} onChange={(event) => setSchool(event.target.value)} className={fieldClassName}>
                <option value="">{vi ? "Chọn Trường/Khoa" : "Select a school/faculty"}</option>
                {SCHOOL_OR_FACULTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block min-w-0 text-sm font-extrabold text-slate-600 dark:text-slate-300">
              {vi ? "Sinh viên khóa (không bắt buộc)" : "Student cohort (optional)"}
              <select value={cohort} onChange={(event) => setCohort(event.target.value)} className={fieldClassName}>
                <option value="">{vi ? "Chọn khóa" : "Select a cohort"}</option>
                {COHORT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <section className="space-y-3 border-t border-slate-100 pt-5 dark:border-white/10" aria-label={vi ? "Tùy chọn" : "Preferences"}>
            <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-slate-100 px-3.5 py-3 dark:border-white/10">
              <div><p className="text-sm font-bold text-slate-600 dark:text-slate-300">{vi ? "Chọn ngôn ngữ" : "Language"}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{vi ? "Chuyển giữa Tiếng Việt và English" : "Switch between English and Vietnamese"}</p></div>
              <button type="button" role="switch" aria-checked={language === "en"} aria-label={vi ? "Chuyển ngôn ngữ" : "Switch language"} onClick={() => setLanguage((current) => current === "vi" ? "en" : "vi")} className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-sky-500 p-1 transition-colors">
                <span className="absolute inset-0 flex items-center justify-between px-1.5 text-[8px] font-black text-white"><span>{language === "vi" ? "VI" : ""}</span><span>{language === "en" ? "EN" : ""}</span></span>
                <span className={`relative z-10 h-5 w-5 rounded-full bg-white shadow transition-transform ${language === "en" ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <PreferenceSwitch label={vi ? "Bật âm thanh mặc định" : "Enable sound by default"} checked={soundEnabled} onChange={setSoundEnabled} />
            <PreferenceSwitch label={vi ? "Nhận thông báo qua email" : "Receive email updates"} checked={emailUpdatesEnabled} onChange={setEmailUpdatesEnabled} />
          </section>

          {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p> : null}
          <button type="submit" disabled={saving} className="lp-btn lp-btn--primary lp-btn--block min-h-12 w-full disabled:cursor-wait disabled:opacity-60">
            {saving ? (vi ? "Đang lưu…" : "Saving…") : (vi ? "Bắt đầu ngay" : "Get started")}
          </button>
        </form>
      </section>
    </main>
  )
}

function LegacyWelcomeFrame() {
  const { completeWelcomeLegacy } = useAuth()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== R2_PUBLIC_ORIGIN || event.source !== frameRef.current?.contentWindow) return
      if (typeof event.data !== "object" || event.data === null || (event.data as { type?: unknown }).type !== "quizpka-welcome-complete") return
      setSaving(true)
      setError(false)
      void completeWelcomeLegacy()
        .then(() => navigate(appRoutes.dashboard, { replace: true }))
        .catch(() => { setError(true); setSaving(false) })
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [completeWelcomeLegacy])

  return (
    <main className="relative min-h-svh">
      <iframe ref={frameRef} title="Chào mừng đến với QuizPKA" src={`${R2_PUBLIC_ASSET_BASE}/welcome-new-user.html`} className="absolute inset-0 h-full min-h-svh w-full border-0" aria-busy={saving} />
      {error ? <p role="alert" className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white">Không thể lưu trạng thái lúc này. Vui lòng thử lại.</p> : null}
      {saving ? <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/70 text-sm font-bold text-slate-700">Đang lưu…</div> : null}
    </main>
  )
}

function PreferenceSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-3.5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-sky-200 dark:border-white/10 dark:text-slate-300 dark:hover:border-sky-400/30">
      <span className="leading-5">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"}`}>
        <input type="checkbox" role="switch" aria-checked={checked} checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}
