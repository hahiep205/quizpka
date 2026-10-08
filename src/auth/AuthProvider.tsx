import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
import { clearEntitlementsCache } from "@/features/entitlements/useEntitlements"
import { logBlockedAccountView } from "@/features/admin/api/blockedViews"
import { setAccountSoundPreference } from "@/features/quiz/lib/answerFeedbackSound"
import { readStorage } from "@/lib/storage"
import type { UserProfileUpdates } from "./profilePreferences"
import type { AuthContextValue, AuthProfile, AuthStatus } from "./auth.types"

const AuthContext = createContext<AuthContextValue | null>(null)

// In-flight dedupe: INITIAL_SESSION + SIGNED_IN có thể về liên tiếp cho cùng
// user (OAuth callback) — dùng chung 1 promise để không gọi GET profiles 2 lần.
let inflightProfile: { userId: string; promise: Promise<AuthProfile | null> } | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) { setProfile(null); return null }
    const { data, error } = await supabase.from("profiles").select("id,email,display_name,avatar_url,role,status,blocked_reason,blocked_at,welcome_completed,school_or_faculty,cohort,preferred_language,sound_enabled,email_updates_enabled").eq("id", currentUser.id).single()
    if (error) throw error
    const nextProfile = data as AuthProfile
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const loadProfileOnce = useCallback((currentUser: User) => {
    if (inflightProfile?.userId === currentUser.id) return inflightProfile.promise
    const promise = loadProfile(currentUser).finally(() => {
      if (inflightProfile?.promise === promise) inflightProfile = null
    })
    inflightProfile = { userId: currentUser.id, promise }
    return promise
  }, [loadProfile])

  const applySession = useCallback(async (session: Session | null, authEvent?: AuthChangeEvent) => {
    const currentUser = session?.user ?? null
    setUser(currentUser)
    if (!currentUser) { setAccountSoundPreference(null); setProfile(null); setStatus("anonymous"); clearEntitlementsCache(); return }

    // Token refresh chứng tỏ session còn sống; profile đã load lúc sign-in.
    // Bỏ qua để không đốt thêm 1 GET /rest/v1/profiles mỗi lần refresh.
    if (authEvent === "TOKEN_REFRESHED") return

    setAccountSoundPreference(null)
    // Keep protected routes in a loading state while replacing the fallback
    // profile below with the verified database role.
    setStatus("loading")
    setProfile(createFallbackProfile(currentUser))
    try {
      const nextProfile = await loadProfileOnce(currentUser)
      const hydratedProfile = nextProfile ? await migrateLegacyPreferences(currentUser, nextProfile) : null
      if (hydratedProfile) {
        setProfile(hydratedProfile)
        setAccountSoundPreference(hydratedProfile.sound_enabled ?? legacySoundPreference(currentUser))
      }
      setStatus(hydratedProfile?.status === "blocked" ? "blocked" : "authenticated")
      if (hydratedProfile?.status === "blocked") {
        // Tài khoản bị chặn vẫn ghi 1 log "đã xem lý do khóa" để admin biết
        // họ đã đọc thông báo chưa (bảng riêng, không dùng user_activity_events
        // vì RLS chỉ cho active user ghi vào đó).
        logBlockedAccountView(currentUser.id)
      } else {
        logActivityEvent(currentUser.id, "login", { provider: currentUser.app_metadata?.provider ?? "google" }, { oncePerSessionKey: `login:${currentUser.id}` })
        if (authEvent === "SIGNED_IN") {
          void supabase.functions.invoke("record-login-event", {
            body: { provider: currentUser.app_metadata?.provider ?? "google" },
          })
        }
      }
    } catch {
      // Fail closed when authorization data cannot be verified.
      setProfile(null)
      setStatus("blocked")
    }
  }, [loadProfileOnce])

  useEffect(() => {
    let mounted = true
    // auth-js luôn emit INITIAL_SESSION ngay sau subscribe (có hoặc không có
    // session) — không gọi getSession() riêng nữa để tránh load profiles 2 lần
    // mỗi lần tải trang. Timeout fallback chỉ là dây an toàn phòng hờ.
    const fallback = window.setTimeout(() => {
      if (!mounted) return
      void supabase.auth.getSession().then(({ data }) => { if (mounted) void applySession(data.session) })
    }, 1500)
    // Supabase recommends deferring follow-up queries from this callback;
    // querying the database synchronously here can deadlock the auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      window.clearTimeout(fallback)
      window.setTimeout(() => { if (mounted) void applySession(session, event) }, 0)
    })
    return () => { mounted = false; window.clearTimeout(fallback); subscription.unsubscribe() }
  }, [applySession])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    clearEntitlementsCache()
  }, [])

  const updateProfile = useCallback(async (updates: { display_name?: string }) => {
    if (!user) return
    const { data, error } = await supabase.rpc("update_my_profile", {
      p_display_name: updates.display_name ?? null,
    })
    if (error) throw error
    const updated = data as AuthProfile
    setProfile((current) => (current ? { ...current, ...updated, blocked_reason: current.blocked_reason, blocked_at: current.blocked_at } : updated))
    logActivityEvent(user.id, "update_profile", { fields: Object.keys(updates) })
  }, [user])

  const updateAccountPreferences = useCallback(async (updates: UserProfileUpdates) => {
    if (!user || !profile) throw new Error("Sign in is required to update account preferences")
    const merged = {
      display_name: updates.display_name === undefined ? profile.display_name : updates.display_name,
      school_or_faculty: updates.school_or_faculty === undefined ? profile.school_or_faculty : updates.school_or_faculty,
      cohort: updates.cohort === undefined ? profile.cohort : updates.cohort,
      preferred_language: updates.preferred_language ?? profile.preferred_language ?? legacyLanguagePreference(),
      sound_enabled: updates.sound_enabled ?? profile.sound_enabled ?? legacySoundPreference(user),
      email_updates_enabled: updates.email_updates_enabled ?? profile.email_updates_enabled ?? legacyEmailUpdatesPreference(user),
    }
    const { data, error } = await supabase.rpc("update_my_account_preferences", {
      p_display_name: merged.display_name,
      p_school_or_faculty: merged.school_or_faculty,
      p_cohort: merged.cohort,
      p_preferred_language: merged.preferred_language,
      p_sound_enabled: merged.sound_enabled,
      p_email_updates_enabled: merged.email_updates_enabled,
    })
    if (error) throw error
    setProfile((current) => current ? { ...current, ...(data as Partial<AuthProfile>) } : current)
    if (updates.sound_enabled !== undefined) setAccountSoundPreference(updates.sound_enabled)
    logActivityEvent(user.id, "update_profile", { fields: Object.keys(updates) })
  }, [profile, user])

  const completeWelcome = useCallback(async (preferences: UserProfileUpdates) => {
    if (!user) throw new Error("Sign in is required to complete onboarding")
    if (!profile) throw new Error("Profile is not available")
    const merged = {
      display_name: preferences.display_name === undefined ? profile.display_name : preferences.display_name,
      school_or_faculty: preferences.school_or_faculty ?? null,
      cohort: preferences.cohort ?? null,
      preferred_language: preferences.preferred_language ?? "vi",
      sound_enabled: preferences.sound_enabled ?? true,
      email_updates_enabled: preferences.email_updates_enabled ?? true,
    }
    const { data, error } = await supabase.rpc("save_my_welcome_preferences", {
      p_display_name: merged.display_name,
      p_school_or_faculty: merged.school_or_faculty,
      p_cohort: merged.cohort,
      p_preferred_language: merged.preferred_language,
      p_sound_enabled: merged.sound_enabled,
      p_email_updates_enabled: merged.email_updates_enabled,
    })
    if (error) throw error
    setProfile((current) => current ? { ...current, ...(data as Partial<AuthProfile>) } : current)
    setAccountSoundPreference(merged.sound_enabled)
  }, [profile, user])

  const completeWelcomeLegacy = useCallback(async () => {
    if (!user) throw new Error("Sign in is required to complete onboarding")
    const { error } = await supabase.rpc("complete_my_welcome")
    if (error) throw error
    setProfile((current) => current ? { ...current, welcome_completed: true } : current)
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({ status, user, profile, signInWithGoogle, signOut, updateProfile, updateAccountPreferences, completeWelcome, completeWelcomeLegacy }), [status, user, profile, signInWithGoogle, signOut, updateProfile, updateAccountPreferences, completeWelcome, completeWelcomeLegacy])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}

function createFallbackProfile(user: User): AuthProfile {
  const displayName = typeof user.user_metadata.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : user.email?.split("@")[0] ?? null
  const avatarUrl = typeof user.user_metadata.avatar_url === "string"
    ? user.user_metadata.avatar_url
    : typeof user.user_metadata.picture === "string"
      ? user.user_metadata.picture
      : null

  return {
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
    avatar_url: avatarUrl,
    role: "user",
    status: "active",
    welcome_completed: true,
    school_or_faculty: null,
    cohort: null,
    preferred_language: null,
    sound_enabled: null,
    email_updates_enabled: null,
  }
}

async function migrateLegacyPreferences(user: User, profile: AuthProfile): Promise<AuthProfile> {
  if (!profile.welcome_completed || (profile.preferred_language !== null && profile.sound_enabled !== null && profile.email_updates_enabled !== null)) {
    return profile
  }

  const storedLanguage = readStorage("quizpka-lang")
  const legacySound = readStorage(`quizpka:${user.id}:sound-enabled`) ?? readStorage("quizpka-sound-enabled")
  const legacyEmailUpdates = readStorage(`quizpka:${user.id}:email-updates`)
  const preferredLanguage = storedLanguage === "en" ? "en" : "vi"
  // Existing settings defaulted to sound on and email updates off.
  const soundEnabled = legacySound === null ? true : legacySound !== "false"
  const emailUpdatesEnabled = legacyEmailUpdates === "true"

  try {
    const { data, error } = await supabase.rpc("migrate_my_legacy_preferences", {
      p_preferred_language: preferredLanguage,
      p_sound_enabled: soundEnabled,
      p_email_updates_enabled: emailUpdatesEnabled,
    })
    if (error || !data || typeof data !== "object") return profile
    return { ...profile, ...(data as Partial<AuthProfile>) }
  } catch {
    // Preference migration must not prevent an existing user from signing in.
    return profile
  }
}

function legacySoundPreference(user: User): boolean {
  const legacySound = readStorage(`quizpka:${user.id}:sound-enabled`) ?? readStorage("quizpka-sound-enabled")
  return legacySound !== "false"
}

function legacyLanguagePreference(): "vi" | "en" {
  return readStorage("quizpka-lang") === "en" ? "en" : "vi"
}

function legacyEmailUpdatesPreference(user: User): boolean {
  return readStorage(`quizpka:${user.id}:email-updates`) === "true"
}
