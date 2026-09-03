import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
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
    try {
      await loadProfile(currentUser)
      setStatus("authenticated")
    } catch {
      setProfile(null)
      setStatus("anonymous")
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

  const value = useMemo<AuthContextValue>(() => ({ status, user, profile, signInWithGoogle, signOut }), [status, user, profile, signInWithGoogle, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
