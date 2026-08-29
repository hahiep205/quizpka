export interface BlockAllOptions {
  /** Chặn phím F12 mở Developer Tools. Mặc định: true */
  blockF12?: boolean
}

const DEV_KEYS = ["i", "j", "c"]
const SAVE_KEYS = ["u", "s"]

function isDevShortcut(e: KeyboardEvent, blockF12: boolean): boolean {
  const k = (e.key || "").toLowerCase()
  const isF12 = e.key === "F12" || e.code === "F12"
  const isDev =
    (e.ctrlKey && e.shiftKey && DEV_KEYS.includes(k)) ||
    (e.ctrlKey && SAVE_KEYS.includes(k)) ||
    (e.metaKey && e.altKey && DEV_KEYS.includes(k)) ||
    (e.metaKey && SAVE_KEYS.includes(k))
  return (blockF12 && isF12) || isDev
}

export function initBlockAll(options: BlockAllOptions = {}) {
  const blockF12 = options.blockF12 !== false
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isDevShortcut(e, blockF12)) {
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

  // document chính
  attachTo(document)

  // Lan chặn vào các iframe cùng nguồn (cùng origin) — PDF viewer / nội dung trong iframe
  // cũng là một document riêng nên listener của trang cha không tự áp dụng.
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
        // iframe khác nguồn (cross-origin): không truy cập được — chỉ trình duyệt/policy mới chặn được
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
