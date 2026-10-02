import { supabase } from "@/lib/supabase"

export type LoginEvent = {
  id: number
  loggedInAt: string
  ipAddress: string
  userAgent: string | null
  provider: string | null
}

export async function fetchUserLoginEvents(userId: string, limit = 50): Promise<LoginEvent[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)))
  const { data, error } = await supabase
    .from("user_login_events")
    .select("id,logged_in_at,ip_address,user_agent,provider")
    .eq("user_id", userId)
    .order("logged_in_at", { ascending: false })
    .limit(safeLimit)
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((row) => {
    if (typeof row.id !== "number" || typeof row.logged_in_at !== "string" || typeof row.ip_address !== "string") return []
    return [{
      id: row.id,
      loggedInAt: row.logged_in_at,
      ipAddress: row.ip_address,
      userAgent: typeof row.user_agent === "string" ? row.user_agent : null,
      provider: typeof row.provider === "string" ? row.provider : null,
    }]
  })
}
