import { logActivityEvent } from "@/features/activity/lib/activityLog"

// Best-effort detection of devtools-open *attempts* (hotkeys / right-click).
// This cannot prove devtools is actually open — browser UIs don't expose that —
// but every attempt is a meaningful integrity signal. Throttled to one row per
// user every 5 minutes so holding a key can't flood the activity log.
const THROTTLE_KEY = "quizpka-devtools-attempt-at"
const THROTTLE_MS = 5 * 60 * 1000

function isDevtoolsHotkey(e: KeyboardEvent): string | null {
  if (e.key === "F12") return "F12"
  const k = (e.key || "").toLowerCase()
  if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) return `ctrl+shift+${k}`
  if (e.metaKey && e.altKey && ["i", "j", "c"].includes(k)) return `meta+alt+${k}`
  if ((e.ctrlKey || e.metaKey) && k === "u") return "view-source"
  return null
}

function throttled(): boolean {
  try {
    const last = Number(sessionStorage.getItem(THROTTLE_KEY) ?? 0)
    if (Date.now() - last < THROTTLE_MS) return true
    sessionStorage.setItem(THROTTLE_KEY, String(Date.now()))
    return false
  } catch {
    return false
  }
}

export function initDevtoolsWatch(userId: string | undefined) {
  if (!userId) return () => {}
  const onKeyDown = (e: KeyboardEvent) => {
    const combo = isDevtoolsHotkey(e)
    if (!combo || throttled()) return
    logActivityEvent(userId, "devtools_attempt", { combo })
  }
  const onContextMenu = () => {
    if (throttled()) return
    logActivityEvent(userId, "devtools_attempt", { combo: "contextmenu" })
  }
  document.addEventListener("keydown", onKeyDown, true)
  document.addEventListener("contextmenu", onContextMenu)
  return () => {
    document.removeEventListener("keydown", onKeyDown, true)
    document.removeEventListener("contextmenu", onContextMenu)
  }
}
