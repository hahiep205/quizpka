/** Safely access browser storage so the app still works in restricted contexts. */
export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies, SSR).
  }
}
