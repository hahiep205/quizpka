import type { User } from "@supabase/supabase-js"
import type { UserPreferences, UserProfileUpdates } from "./profilePreferences"

export type AuthStatus = "loading" | "authenticated" | "blocked" | "anonymous"
export type AuthProfile = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  status: "active" | "blocked"
  welcome_completed: boolean
  school_or_faculty: UserPreferences["school_or_faculty"]
  cohort: UserPreferences["cohort"]
  preferred_language: UserPreferences["preferred_language"] | null
  sound_enabled: boolean | null
  email_updates_enabled: boolean | null
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
  updateAccountPreferences: (updates: UserProfileUpdates) => Promise<void>
  completeWelcome: (preferences: UserProfileUpdates) => Promise<void>
  completeWelcomeLegacy: () => Promise<void>
}
