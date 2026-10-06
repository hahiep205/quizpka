import type { User } from "@supabase/supabase-js"

export type AuthStatus = "loading" | "authenticated" | "blocked" | "anonymous"
export type AuthProfile = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  status: "active" | "blocked"
  welcome_completed: boolean
  blocked_reason?: string | null
  blocked_at?: string | null
}
export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  profile: AuthProfile | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: { display_name?: string }) => Promise<void>
  completeWelcome: () => Promise<void>
}
