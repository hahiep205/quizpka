const SAVE_KEYS = ["u", "s"]

function isBlockedShortcut(e: KeyboardEvent): boolean {
  const k = (e.key || "").toLowerCase()
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
    }
  }

  const attachTo = (doc: Document) => {
    doc.addEventListener("contextmenu", onContextMenu)
    doc.addEventListener("keydown", onKeyDown, true)
  }
  const detachFrom = (doc: Document) => {
    doc.removeEventListener("contextmenu", onContextMenu)
    doc.removeEventListener("keydown", onKeyDown, true)
  }

  attachTo(document)

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
    for (const frame of Array.from(document.querySelectorAll("iframe"))) {
      try {
        const doc = frame.contentDocument
        if (doc) detachFrom(doc)
      } catch { /* noop */ }
    }
    if (frameTimer) window.clearInterval(frameTimer)
  }
}
