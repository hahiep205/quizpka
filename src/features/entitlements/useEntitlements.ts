import { useEffect, useState } from "react"
import { getOwnedProductIds } from "@/lib/purchases"

// Shared per-user entitlement cache so mounting PurchasedView, catalog cards
// and detail pages together costs ONE /purchases request instead of ~33.
// Same module-cache pattern as useSubjectOverrides.
const TTL_MS = 60_000

type CacheEntry = { owned: Set<string>; fetched: Set<string>; at: number }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<Set<string>>>()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function isFresh(entry: CacheEntry | undefined): boolean {
  return Boolean(entry) && Date.now() - (entry as CacheEntry).at < TTL_MS
}

function snapshot(userId: string | undefined | null): Set<string> {
  if (!userId) return new Set()
  return new Set(cache.get(userId)?.owned ?? [])
}

/** Load (or reuse) the owned set for this user. Concurrent mounts share one promise. */
export function loadEntitlements(userId: string, productIds: readonly string[]): Promise<Set<string>> {
  const unique = [...new Set(productIds.filter(Boolean))]
  if (unique.length === 0) return Promise.resolve(new Set())
  const entry = cache.get(userId)
  if (isFresh(entry) && unique.every((id) => entry?.fetched.has(id))) {
    return Promise.resolve(new Set(entry?.owned ?? []))
  }
  const running = inflight.get(userId)
  if (running) return running.then((owned) => new Set(owned))
  const requested = new Set([...(entry?.fetched ?? []), ...unique])
  const task = getOwnedProductIds(userId, [...requested])
    .then((owned) => {
      cache.set(userId, { owned: new Set(owned), fetched: requested, at: Date.now() })
      emit()
      return new Set(owned)
    })
    .finally(() => {
      inflight.delete(userId)
    })
  inflight.set(userId, task)
  return task
}

/** Drop cache for one user (logout / user switch) or everything. */
export function clearEntitlementsCache(userId?: string): void {
  if (userId) {
    cache.delete(userId)
    inflight.delete(userId)
  } else {
    cache.clear()
    inflight.clear()
  }
  emit()
}

/** Force refetch on next read (e.g. after a failed purchase check). */
export function invalidateEntitlements(userId: string): void {
  cache.delete(userId)
  emit()
}

/** Optimistic update right after PaymentModal reports success. */
export function markEntitlementOwned(userId: string, productId: string): void {
  if (!productId) return
  const entry = cache.get(userId)
  if (entry) {
    entry.owned.add(productId)
    entry.fetched.add(productId)
  } else {
    cache.set(userId, { owned: new Set([productId]), fetched: new Set([productId]), at: Date.now() })
  }
  emit()
}

/** Test-only reset. */
export function resetEntitlementsForTests(): void {
  cache.clear()
  inflight.clear()
  listeners.clear()
}

export function useEntitlements(userId: string | undefined | null, productIds: readonly string[]) {
  const key = [...new Set(productIds.filter(Boolean))].sort().join(",")
  const [owned, setOwned] = useState<Set<string>>(() => snapshot(userId ?? undefined))
  const [loading, setLoading] = useState(() => Boolean(userId) && uniqueOf(productIds).length > 0 && !isFresh(userId ? cache.get(userId) : undefined))
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId || uniqueOf(productIds).length === 0) {
      setOwned(new Set())
      setLoading(false)
      return
    }
    let active = true
    const refresh = () => {
      if (active) setOwned(snapshot(userId))
    }
    listeners.add(refresh)
    setLoading(true)
    setError(false)
    void loadEntitlements(userId, uniqueOf(productIds))
      .then((next) => {
        if (active) setOwned(next)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      listeners.delete(refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key])

  return { owned, loading, error }
}

function uniqueOf(productIds: readonly string[]): string[] {
  return [...new Set(productIds.filter(Boolean))]
}
