import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { logActivityEvent } from "@/features/activity/lib/activityLog"
import type { AuthContextValue, AuthProfile, AuthStatus } from "./auth.types"

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) { setProfile(null); return }
    const { data, error } = await supabase.from("profiles").select("id,email,display_name,avatar_url,role,status").eq("id", currentUser.id).single()
    if (error) throw error
    setProfile(data as AuthProfile)
  }, [])

  const applySession = useCallback(async (session: Session | null) => {
    const currentUser = session?.user ?? null
    setUser(currentUser)
    if (!currentUser) { setProfile(null); setStatus("anonymous"); return }

    // A valid auth session is enough to leave the OAuth callback screen.
    // Profile data can load independently and must not block navigation.
    setProfile(createFallbackProfile(currentUser))
    setStatus("authenticated")
    logActivityEvent(currentUser.id, "login", { provider: currentUser.app_metadata?.provider ?? "google" }, { oncePerSessionKey: `login:${currentUser.id}` })
    try {
      await loadProfile(currentUser)
    } catch {
      // Keep the metadata fallback when the profile row is temporarily unavailable.
    }
  }, [loadProfile])

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => { if (mounted) void applySession(data.session) })
    // Supabase recommends deferring follow-up queries from this callback;
    // querying the database synchronously here can deadlock the auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      window.setTimeout(() => { if (mounted) void applySession(session) }, 0)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [applySession])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const updateProfile = useCallback(async (updates: { display_name?: string }) => {
    if (!user) return
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select("id,email,display_name,avatar_url,role,status").single()
    if (error) throw error
    setProfile(data as AuthProfile)
    logActivityEvent(user.id, "update_profile", { fields: Object.keys(updates) })
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({ status, user, profile, signInWithGoogle, signOut, updateProfile }), [status, user, profile, signInWithGoogle, signOut, updateProfile])
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
  }
}
