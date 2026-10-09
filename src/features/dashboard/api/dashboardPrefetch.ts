import { prefetchSyncedHistory } from "@/features/history/api/userHistory"
import { loadEntitlements } from "@/features/entitlements/useEntitlements"
import { fetchLeaderboardSnapshot, fetchMyLeaderboardScore } from "@/lib/leaderboard"
import { getAllPaidProductIds } from "@/lib/purchases"
import { supabase } from "@/lib/supabase"

const VISIBILITY_CACHE_TTL_MS = 60_000
const visibilityCache = new Map<string, { value: boolean; fetchedAt: number }>()
const visibilityInflight = new Map<string, Promise<boolean>>()
const dashboardPrefetchInflight = new Map<string, Promise<void>>()
const dashboardPrefetchCompleteAt = new Map<string, number>()

export function setCachedLeaderboardVisibility(userId: string, value: boolean): void {
  visibilityCache.set(userId, { value, fetchedAt: Date.now() })
}

export async function loadLeaderboardVisibility(userId: string, force = false): Promise<boolean> {
  const cached = visibilityCache.get(userId)
  if (!force && cached && Date.now() - cached.fetchedAt < VISIBILITY_CACHE_TTL_MS) return cached.value
  const running = visibilityInflight.get(userId)
  if (running) return running

  const request = (async () => {
    const { data, error } = await supabase.rpc("get_my_leaderboard_visibility")
    if (error) throw error
    if (typeof data !== "boolean") throw new Error("Invalid leaderboard visibility response")
    setCachedLeaderboardVisibility(userId, data)
    return data
  })()
  visibilityInflight.set(userId, request)
  try {
    return await request
  } finally {
    if (visibilityInflight.get(userId) === request) visibilityInflight.delete(userId)
  }
}

/** Warm dashboard views in a low-priority sequence after the home view renders. */
export function prefetchDashboardData(
  userId: string,
  userCreatedAt?: string,
  isCurrentUser: () => boolean = () => true,
): Promise<void> {
  const completedAt = dashboardPrefetchCompleteAt.get(userId)
  if (completedAt && Date.now() - completedAt < VISIBILITY_CACHE_TTL_MS) return Promise.resolve()
  const running = dashboardPrefetchInflight.get(userId)
  if (running) return running

  const request = (async () => {
    if (!isCurrentUser()) return
    await prefetchSyncedHistory(userId, userCreatedAt).catch(() => undefined)
    if (!isCurrentUser()) return
    await Promise.all([
      fetchLeaderboardSnapshot("all", userId),
      fetchMyLeaderboardScore(userId),
    ])
    if (!isCurrentUser()) return
    await loadEntitlements(userId, getAllPaidProductIds()).catch(() => undefined)
    if (!isCurrentUser()) return
    await loadLeaderboardVisibility(userId).catch(() => undefined)
    if (isCurrentUser()) dashboardPrefetchCompleteAt.set(userId, Date.now())
  })()
  dashboardPrefetchInflight.set(userId, request)
  const clearRequest = () => {
    if (dashboardPrefetchInflight.get(userId) === request) dashboardPrefetchInflight.delete(userId)
  }
  void request.then(clearRequest, clearRequest)
  return request
}
