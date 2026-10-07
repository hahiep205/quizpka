export const R2_PUBLIC_BASE = "https://pub-2b172bb81d224085aab3d04e88be8508.r2.dev"
export const R2_PUBLIC_ASSET_BASE = `${R2_PUBLIC_BASE}/public`
export const R2_SRC_ASSET_BASE = `${R2_PUBLIC_BASE}/src/assets`
export const R2_PUBLIC_ORIGIN = new URL(R2_PUBLIC_BASE).origin

const HERO_VIDEO = /^animo-column-drift-720p(?:-dark)?\.webm$/
const R2_PREFIX_REWRITES = [
  ["tadv/", "tadv/"],
  ["tadv-traphi/", "tadv-traphi/"],
  ["toeic-test/", "toeic/"],
  ["kinh_te_vi_mo/", "data/kinh_te_vi_mo/"],
] as const

/** Bank prefixes hosted on R2 under the `data/` key prefix (repo mirror: r2-banks/data/). */
const R2_BANK_PREFIXES = [
  "tadv/",
  "toeic-test/",
  "kinh_te_vi_mo/",
  "tu-tuong-hcm-giua-ky/",
  "lich-su-dang-giua-ky/",
  "quan-tri-hoc-giua-ky/",
  "chu-nghia-khoa-hoc-xa-hoi-giua-ky/",
  "kinh-te-chinh-tri-mac-lenin-giua-ky/",
  "triet-hoc-mac-lenin-2tc-giua-ky/",
  "triet-hoc-mac-lenin-3tc-giua-ky/",
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

/** Resolves question-bank JSON URLs: the 10 free-subject banks load from R2 (key keeps the `data/` prefix); other paths stay as-is. */
export function toBankUrl(value: string): string {
  const relativePath = stripPublicPrefix(value)
  if (R2_BANK_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return `${R2_PUBLIC_BASE}/data/${relativePath}`
  }
  return value
}
