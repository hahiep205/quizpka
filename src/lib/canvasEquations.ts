/**
 * Canvas LMS equation images leak into imported banks either as full tags
 * (`<img … data-equation-content="…" …>`) or as headless tails
 * (`…" src="…equation_images/…" alt="LaTeX: …" data-equation-content="…" …>`)
 * left behind by the importer. Convert them back to `\(tex\)` so MathText
 * renders them like every other formula. Idempotent.
 */

// Attribute values are matched quote-aware so a `>` inside `alt="…(A,B>0)…"`
// never truncates the match.
const FULL_IMG_PATTERN = /([ \t]*)(<img\b(?:(?:"[^"]*"|'[^']*'|[^<>"'])*)>)/gi
// Headless tail: a dangling `" src="http…">` fragment. The equation check
// happens in the replacer so legitimate quoted text is never touched.
const IMG_TAIL_PATTERN = /([ \t]*\S+?)"\s*(src=(?:"[^"]*"|'[^']*')(?:(?:"[^"]*"|'[^']*'|[^<>"'])*>))/gi

const ENTITY_PATTERN = /&(amp|lt|gt|quot|nbsp|apos|#39|#x27|#x22|#\d+|#x[0-9a-fA-F]+);/g

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  nbsp: " ",
  apos: "'",
  "#39": "'",
  "#x27": "'",
  "#x22": '"',
}

export function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY_PATTERN, (entity, name: string) => {
    const lower = name.toLowerCase()
    if (lower in NAMED_ENTITIES) return NAMED_ENTITIES[lower]
    if (lower.startsWith("#x")) {
      const code = parseInt(lower.slice(2), 16)
      return Number.isFinite(code) ? String.fromCharCode(code) : entity
    }
    if (lower.startsWith("#")) {
      const code = Number(lower.slice(1))
      return Number.isFinite(code) ? String.fromCharCode(code) : entity
    }
    return entity
  })
}

function equationReplacement(tag: string): string | null {
  if (!/equation_images|data-equation-content|alt="LaTeX:/i.test(tag)) return null
  const dataAttr = /data-equation-content="([^"]*)"/i.exec(tag)?.[1] ?? ""
  const altAttr = /alt="([^"]*)"/i.exec(tag)?.[1] ?? ""
  const latexAlt = /^\s*LaTeX:\s*([\s\S]*?)\s*$/i.exec(altAttr)?.[1] ?? ""
  const tex = (dataAttr || latexAlt).trim()
  if (tex) return ` \\(${decodeHtmlEntities(tex)}\\)`
  if (/^\s*LaTeX:/i.test(altAttr)) return ""
  const plainAlt = altAttr.trim()
  return plainAlt ? ` ${decodeHtmlEntities(plainAlt)}` : ""
}

export function replaceCanvasEquationImages(text: string): string {
  if (!text || !text.includes("src=")) return text
  const withoutFullTags = text.replace(FULL_IMG_PATTERN, (_match, _gap: string, tag: string) => equationReplacement(tag) ?? _match)
  return withoutFullTags.replace(IMG_TAIL_PATTERN, (match, _head: string, tag: string) => {
    void _head
    return equationReplacement(tag) ?? match
  })
}
