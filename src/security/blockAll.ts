const SAVE_KEYS = ["u", "s"]
const DEVTOOLS_KEYS = ["i", "j", "c"]

export function isBlockedShortcut(e: KeyboardEvent): boolean {
  const k = (e.key || "").toLowerCase()
  const code = (e as unknown as { code?: string }).code || ""
  const keyCode = (e as unknown as { keyCode?: number }).keyCode || (e as unknown as { which?: number }).which || 0
  if (e.key === "F12" || code === "F12" || keyCode === 123) return true
  if ((e.ctrlKey && e.shiftKey) || (e.metaKey && e.altKey)) {
    if (DEVTOOLS_KEYS.includes(k)) return true
  }
  return (e.ctrlKey && SAVE_KEYS.includes(k)) || (e.metaKey && SAVE_KEYS.includes(k))
}

export function initBlockAll() {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isBlockedShortcut(e)) {
      e.preventDefault()
      e.stopPropagation()
      // Some browsers need immediate propagation stop and returnValue
      // @ts-ignore
      if (e.stopImmediatePropagation) e.stopImmediatePropagation()
      // @ts-ignore
      e.returnValue = false
      return false as unknown as void
    }
  }

  const attachTo = (doc: Document) => {
    doc.addEventListener("contextmenu", onContextMenu)
    doc.addEventListener("keydown", onKeyDown, true)
    // Capture on window as well — some browsers fire devtools shortcuts on window, not document
    try {
      const win = doc.defaultView ?? (typeof window !== "undefined" ? window : null)
      if (win) {
        win.addEventListener("contextmenu", onContextMenu as unknown as EventListener)
        win.addEventListener("keydown", onKeyDown as unknown as EventListener, true)
      }
    } catch { /* noop */ }
  }
  const detachFrom = (doc: Document) => {
    doc.removeEventListener("contextmenu", onContextMenu)
    doc.removeEventListener("keydown", onKeyDown, true)
    try {
      const win = doc.defaultView ?? (typeof window !== "undefined" ? window : null)
      if (win) {
        win.removeEventListener("contextmenu", onContextMenu as unknown as EventListener)
        win.removeEventListener("keydown", onKeyDown as unknown as EventListener, true)
      }
    } catch { /* noop */ }
  }

  attachTo(document)
  // Direct window listeners for browsers that don't bubble F12 to document
  try {
    window.addEventListener("keydown", onKeyDown as unknown as EventListener, true)
    window.addEventListener("contextmenu", onContextMenu as unknown as EventListener)
  } catch { /* noop */ }

  const attachedFrames = new WeakSet<Document>()
  let frameTimer: number | undefined
  const guardIframes = () => {
    for (const frame of Array.from(document.querySelectorAll("iframe"))) {
      try {
        const doc = frame.contentDocument
        if (doc && !attachedFrames.has(doc)) {
          attachTo(doc)
          attachedFrames.add(doc)
        }
      } catch {
        // cross-origin iframe
      }
    }
  }
  frameTimer = window.setInterval(guardIframes, 1500)
  guardIframes()

  return () => {
    detachFrom(document)
    try {
      window.removeEventListener("keydown", onKeyDown as unknown as EventListener, true)
      window.removeEventListener("contextmenu", onContextMenu as unknown as EventListener)
    } catch { /* noop */ }
    for (const frame of Array.from(document.querySelectorAll("iframe"))) {
      try {
        const doc = frame.contentDocument
        if (doc) detachFrom(doc)
      } catch { /* noop */ }
    }
    if (frameTimer) window.clearInterval(frameTimer)
  }
}
