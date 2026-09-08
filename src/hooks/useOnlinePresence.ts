import { useEffect, useState, useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { readStorage, writeStorage } from "@/lib/storage"

const VISITOR_KEY = "quizpka-presence-id"

function getVisitorId(userId?: string): string {
  if (userId) return `user:${userId}`
  const existing = readStorage(VISITOR_KEY)
  if (existing) return `visitor:${existing}`
  const created = crypto.randomUUID()
  writeStorage(VISITOR_KEY, created)
  return `visitor:${created}`
}

// Shared store of online *user* ids, fed by the single "website-presence"
// subscription below. Realtime-js reuses one channel instance per topic and
// throws if `.on()` is called after `.subscribe()`, so there must be exactly
// one subscriber: this hook (mounted once in App). Other components read via
// useOnlineUserIds() and never touch the channel directly.
let onlineUserIds: ReadonlySet<string> = new Set()
const onlineListeners = new Set<() => void>()

function emitOnlineIds() {
  onlineListeners.forEach((listener) => listener())
}

function subscribeOnlineIds(listener: () => void): () => void {
  onlineListeners.add(listener)
  return () => {
    onlineListeners.delete(listener)
  }
}

function snapshotOnlineIds(): ReadonlySet<string> {
  return onlineUserIds
}

function syncOnlineIds(state: Record<string, unknown>) {
  const next = new Set<string>()
  for (const key of Object.keys(state)) {
    if (key.startsWith("user:")) next.add(key.slice("user:".length))
  }
  if (next.size === onlineUserIds.size) {
    let same = true
    for (const id of next) {
      if (!onlineUserIds.has(id)) {
        same = false
        break
      }
    }
    if (same) return
  }
  onlineUserIds = next
  emitOnlineIds()
}

export function useOnlinePresence(userId?: string): number {
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    const presenceKey = getVisitorId(userId)
    const channel = supabase.channel("website-presence", {
      config: { presence: { key: presenceKey } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
        syncOnlineIds(state)
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      void channel.untrack()
      void supabase.removeChannel(channel)
    }
  }, [userId])

  return onlineCount
}

export function useOnlineUserIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeOnlineIds, snapshotOnlineIds, snapshotOnlineIds)
}
