export function initBlockAll() {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    const isDev =
      // TẠM MỞ F12: đã bỏ chặn F12
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
      (e.ctrlKey && ["u", "s"].includes(k)) ||
      (e.metaKey && e.altKey && ["i", "j", "c"].includes(k)) ||
      (e.metaKey && ["u", "s"].includes(k))
    if (isDev) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  document.addEventListener("contextmenu", onContextMenu)
  document.addEventListener("keydown", onKeyDown, true)

  return () => {
    document.removeEventListener("contextmenu", onContextMenu)
    document.removeEventListener("keydown", onKeyDown, true)
  }
}
