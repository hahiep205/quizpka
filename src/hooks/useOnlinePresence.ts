import { useEffect, useState } from "react"
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

export function useOnlinePresence(userId?: string): number {
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    const presenceKey = getVisitorId(userId)
    const channel = supabase.channel("website-presence", {
      config: { presence: { key: presenceKey } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length)
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
