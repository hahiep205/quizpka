import { useEffect, useMemo, useSyncExternalStore } from "react"
import { useAuth } from "@/auth/AuthProvider"
import { supabase } from "@/lib/supabase"
import { fetchNotifications, fetchUnreadDirectNotification, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, type UserNotification } from "./api/notifications"

type Filter = "all" | "unread"
type Page = { items: UserNotification[]; hasMore: boolean; loading: boolean; error: string | null; pages: number }
type Snapshot = {
  all: Page
  unread: Page
  unreadCount: number
  direct: UserNotification | null
  error: string | null
  mutationError: string | null
  mutating: boolean
}
const emptyPage = (): Page => ({ items: [], hasMore: false, loading: false, error: null, pages: 0 })
const emptySnapshot = (): Snapshot => ({ all: emptyPage(), unread: emptyPage(), unreadCount: 0, direct: null, error: null, mutationError: null, mutating: false })
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Notification request failed. Please try again."
const cursorOf = (item: UserNotification) => ({ createdAt: item.createdAt, id: item.id })

function createStore(userId: string | null) {
  let state = emptySnapshot()
  const listeners = new Set<() => void>()
  // Keep only dismissed IDs across route unmounts, never notification content.
  const dismissed = new Set<number>()
  let active = false
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let dispose: (() => void) | undefined
  const publish = (patch: Partial<Snapshot>) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }
  const current = (token: number) => active && token === revision

  async function findDirect(token: number) {
    const first = await fetchUnreadDirectNotification()
    if (!first || !dismissed.has(first.id)) return first
    let cursor: ReturnType<typeof cursorOf> | undefined
    // A dismissed newest row must not hide older pending direct notifications.
    while (current(token)) {
      const items = await fetchNotifications(cursor, { unreadOnly: true, directOnly: true })
      const next = items.find((item) => !dismissed.has(item.id))
      if (next) return next
      if (items.length < 30) return null
      cursor = cursorOf(items[items.length - 1])
    }
    return null
  }

  async function refresh() {
    if (!active || state.mutating) return
    clearTimeout(timer)
    const token = ++revision
    const filters = (["all", "unread"] as const).filter((filter) => state[filter].pages > 0)
    for (const filter of filters) publish({ [filter]: { ...state[filter], loading: true } })
    publish({ error: null })
    await Promise.all([
      fetchUnreadNotificationCount()
        .then((unreadCount) => { if (current(token)) publish({ unreadCount }) })
        .catch((error: unknown) => { if (current(token)) publish({ error: errorMessage(error) }) }),
      findDirect(token)
        .then((direct) => { if (current(token)) publish({ direct }) })
        .catch((error: unknown) => { if (current(token)) publish({ error: errorMessage(error) }) }),
      ...filters.map(async (filter) => {
        try {
          // Refresh only the first page, never replay an arbitrarily long cursor chain.
          const items = await fetchNotifications(undefined, { unreadOnly: filter === "unread" })
          if (current(token)) publish({ [filter]: { items, hasMore: items.length === 30, pages: 1, loading: false, error: null } })
        } catch (error) {
          if (current(token)) publish({ [filter]: { ...state[filter], loading: false, error: errorMessage(error) } })
        }
      }),
    ])
  }

  function invalidate() {
    if (!active) return
    // Invalidate in-flight reads immediately, but coalesce bursts of deliveries.
    revision++
    clearTimeout(timer)
    timer = setTimeout(() => { void refresh() }, 250)
  }

  function stop() {
    active = false
    revision++
    clearTimeout(timer)
    dispose?.()
    dispose = undefined
    publish(emptySnapshot())
  }

  function start() {
    if (!userId || active) return
    active = true
    const onVisible = () => { if (document.visibilityState === "visible") invalidate() }
    const channel = supabase.channel(`recipient-notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_recipients", filter: `recipient_id=eq.${userId}` }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notification_recipients", filter: `recipient_id=eq.${userId}` }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notification_batch_events" }, () => {
        if (!active) return
        // The event contains no content. Drop cached content before authoritative refetch.
        publish({ direct: null, all: { ...state.all, items: [], hasMore: false, loading: state.all.pages > 0 }, unread: { ...state.unread, items: [], hasMore: false, loading: state.unread.pages > 0 } })
        invalidate()
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") invalidate() })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== userId) stop()
    })
    window.addEventListener("focus", onVisible)
    window.addEventListener("online", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    const interval = setInterval(onVisible, 60_000)
    dispose = () => {
      void supabase.removeChannel(channel)
      subscription.unsubscribe()
      window.removeEventListener("focus", onVisible)
      window.removeEventListener("online", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(interval)
    }
    void refresh()
  }

  async function mutate(id?: number) {
    if (!active || !userId) throw new Error("Sign in to update notifications.")
    if (state.mutating) throw new Error("A notification update is already in progress.")
    revision++
    publish({ mutating: true, mutationError: null })
    // Realtime invalidations can change revision while a write is pending.
    const lifetime = dispose
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!active || dispose !== lifetime || data.session?.user.id !== userId) throw new Error("Your session changed. Please try again.")
      if (id === undefined) await markAllNotificationsRead()
      else await markNotificationRead(id)
      if (!active || dispose !== lifetime) return
      const readAt = new Date().toISOString()
      const update = (item: UserNotification) => id === undefined || item.id === id ? { ...item, readAt: item.readAt ?? readAt } : item
      publish({
        all: { ...state.all, items: state.all.items.map(update) },
        unread: { ...state.unread, items: state.unread.items.filter((item) => id !== undefined && item.id !== id) },
        direct: id === undefined || state.direct?.id === id ? null : state.direct,
      })
    } catch (error) {
      if (active && dispose === lifetime) publish({ mutationError: errorMessage(error) })
      throw error
    } finally {
      if (active && dispose === lifetime) {
        publish({ mutating: false })
        await refresh()
      }
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(this: void, listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) start()
      return () => { listeners.delete(listener); if (!listeners.size) stop() }
    },
    ensureList(filter: Filter) {
      if (!active || state[filter].pages) return
      publish({ [filter]: { ...state[filter], pages: 1, loading: true } })
      invalidate()
    },
    async loadMore(filter: Filter) {
      const page = state[filter]
      if (!active || page.loading || !page.hasMore || state.mutating) return
      const token = revision
      publish({ [filter]: { ...page, loading: true, error: null } })
      try {
        const last = page.items[page.items.length - 1]
        const items = await fetchNotifications(last ? cursorOf(last) : undefined, { unreadOnly: filter === "unread" })
        if (current(token)) publish({ [filter]: { items: [...page.items, ...items.filter((item) => !page.items.some((existing) => existing.id === item.id))], hasMore: items.length === 30, pages: page.pages + 1, loading: false, error: null } })
      } catch (error) {
        if (current(token)) publish({ [filter]: { ...page, loading: false, error: errorMessage(error) } })
      }
    },
    refresh,
    markRead: (id: number) => mutate(id),
    markAllRead: () => mutate(),
    dismissDirect(this: void) {
      if (state.direct) dismissed.add(state.direct.id)
      publish({ direct: null })
      invalidate()
    },
  }
}

const stores = new Map<string | null, ReturnType<typeof createStore>>()

export function useNotifications(filter?: Filter) {
  const { user, profile, status } = useAuth()
  const userId = status === "authenticated" && profile?.id === user?.id && profile?.status !== "blocked" ? user?.id ?? null : null
  const store = useMemo(() => {
    let value = stores.get(userId)
    if (!value) { value = createStore(userId); stores.set(userId, value) }
    return value
  }, [userId])
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useEffect(() => { if (filter) store.ensureList(filter) }, [store, filter])
  return { ...snapshot, page: snapshot[filter ?? "all"], userId, refresh: store.refresh, loadMore: () => filter ? store.loadMore(filter) : Promise.resolve(), markRead: store.markRead, markAllRead: store.markAllRead, dismissDirect: store.dismissDirect }
}
