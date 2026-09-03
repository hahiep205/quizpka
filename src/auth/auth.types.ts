import type { User } from "@supabase/supabase-js"

export type AuthStatus = "loading" | "authenticated" | "anonymous"
export type AuthProfile = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  status: "active" | "blocked"
}
export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  profile: AuthProfile | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}
