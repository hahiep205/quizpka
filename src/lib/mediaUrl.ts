export const R2_PUBLIC_BASE = "https://pub-2b172bb81d224085aab3d04e88be8508.r2.dev"

const HERO_VIDEO = /^animo-column-drift-720p(?:-dark)?\.webm$/
const R2_PREFIX_REWRITES = [
  ["tadv/", "tadv/"],
  ["tadv-traphi/", "tadv-traphi/"],
  ["toeic-test/", "toeic/"],
] as const

function isRemoteUrl(value: string) {
  return /^(https?:)?\/\//.test(value)
}

function stripPublicPrefix(value: string) {
  if (value.startsWith("/data/")) return value.slice("/data/".length)
  if (value.startsWith("/")) return value.slice(1)
  return value
}

function toR2ObjectPath(relativePath: string) {
  if (HERO_VIDEO.test(relativePath)) return relativePath
  const rewrite = R2_PREFIX_REWRITES.find(([from]) => relativePath.startsWith(from))
  if (!rewrite) return undefined
  const [from, to] = rewrite
  return `${to}${relativePath.slice(from.length)}`
}

/** Resolves quiz/PDF/hero media: TADV, TOEIC, and hero videos go to R2; other relative paths stay under /data. */
export function toMediaUrl(value: string): string
export function toMediaUrl(value: unknown): string | undefined
export function toMediaUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined
  if (isRemoteUrl(value)) return value

  const original = value
  const relativePath = stripPublicPrefix(value).replace(/part5-image-test\d+\//g, "")
  const r2Path = toR2ObjectPath(relativePath)
  if (r2Path) return `${R2_PUBLIC_BASE}/${r2Path}`
  if (original.startsWith("/")) return original
  return `/data/${relativePath}`
}
