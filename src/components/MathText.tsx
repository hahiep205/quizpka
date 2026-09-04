import { useMemo } from "react"
import katex from "katex"

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

const MATH_PATTERN = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$/g

/** Render `\(...\)` / `\[...\]` / `$$...$$` segments with KaTeX; other text is HTML-escaped. */
export function renderMathHtml(text: string): string {
  let html = ""
  let lastIndex = 0
  MATH_PATTERN.lastIndex = 0
  for (let match = MATH_PATTERN.exec(text); match; match = MATH_PATTERN.exec(text)) {
    html += escapeHtml(text.slice(lastIndex, match.index))
    const tex = match[1] ?? match[2] ?? match[3] ?? ""
    const displayMode = match[1] !== undefined || match[3] !== undefined
    try {
      html += katex.renderToString(tex, { displayMode, throwOnError: false, trust: false, strict: false })
    } catch {
      html += `<span class="katex-error">${escapeHtml(match[0])}</span>`
    }
    lastIndex = match.index + match[0].length
  }
  html += escapeHtml(text.slice(lastIndex))
  return html
}

/**
 * Inline text with LaTeX math support. Renders as a span; safe to nest
 * inside headings, paragraphs, or option labels. Output is identical to
 * plain text when no math delimiters are present.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMathHtml(text), [text])
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
