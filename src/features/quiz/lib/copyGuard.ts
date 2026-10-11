import type { ClipboardEvent, DragEvent } from "react"

/**
 * Chặn copy/cut/kéo-thả trong vùng nội dung quiz (mức base: kết hợp với
 * `select-none` để khỏi bôi xanh). Chừa lại ô input/textarea để user vẫn
 * gõ và thao tác chữ mình nhập ở câu tự luận.
 */
export function guardQuizContentCopy(e: ClipboardEvent | DragEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
  e.preventDefault()
}
