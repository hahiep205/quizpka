import { cpSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const dataRoot = join(root, "data")
const publicData = join(root, "public", "data")

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function copyFile(src, dest) {
  ensureDir(dirname(dest))
  cpSync(src, dest)
  console.log(`[sync-data] ${src.replace(root + "\\", "")} -> ${dest.replace(root + "\\", "")}`)
}

function copyDirRecursive(srcDir, destDir) {
  ensureDir(destDir)
  for (const entry of readdirSync(srcDir)) {
    const src = join(srcDir, entry)
    const dest = join(destDir, entry)
    const stat = statSync(src)
    if (stat.isDirectory()) copyDirRecursive(src, dest)
    else copyFile(src, dest)
  }
}

// Main sync
ensureDir(publicData)

// General + Major JSONs
for (const sub of ["General", "Major"]) {
  const srcDir = join(dataRoot, sub)
  try {
    for (const file of readdirSync(srcDir)) {
      if (file.endsWith(".json")) copyFile(join(srcDir, file), join(publicData, file))
    }
  } catch {}
}

// TADV - 01, 02, 03
function syncTadv(dept, destPrefix, filePrefix) {
  const srcDir = join(dataRoot, "TADV", dept)
  const destReading = join(publicData, `${destPrefix}-reading.json`)
  const destListening = join(publicData, `${destPrefix}-listening.json`)
  try {
    // Patch and copy reading.json (imageUrl)
    const readingSrc = join(srcDir, "reading.json")
    const readingData = JSON.parse(readFileSync(readingSrc, "utf8"))
    for (const part of readingData.parts ?? []) {
      if (part.imageUrl && filePrefix) part.imageUrl = `${filePrefix}-${part.imageUrl}`
    }
    ensureDir(dirname(destReading))
    writeFileSync(destReading, JSON.stringify(readingData, null, 2), "utf8")
    console.log(`[sync-data] ${readingSrc.replace(root + "\\", "")} -> ${destReading.replace(root + "\\", "")} (patched)`)

    // Patch and copy listening.json (audioUrl)
    const listeningSrc = join(srcDir, "listening.json")
    const listeningData = JSON.parse(readFileSync(listeningSrc, "utf8"))
    for (const part of listeningData.parts ?? []) {
      if (part.audioUrl && filePrefix) part.audioUrl = `${filePrefix}-${part.audioUrl}`
    }
    ensureDir(dirname(destListening))
    writeFileSync(destListening, JSON.stringify(listeningData, null, 2), "utf8")
    console.log(`[sync-data] ${listeningSrc.replace(root + "\\", "")} -> ${destListening.replace(root + "\\", "")} (patched)`)

    // Copy assets with prefix - handle image name mismatch for 02/03
    const allFiles = readdirSync(srcDir)
    // First copy all mp3 with prefix (audio names match)
    for (const file of allFiles) {
      if (file.endsWith(".mp3")) {
        const destFile = filePrefix ? `${filePrefix}-${file}` : file
        copyFile(join(srcDir, file), join(publicData, destFile))
      }
    }
    // Copy pngs: ensure expected imageUrl files exist
    const expectedImages = (readingData.parts ?? []).map((p) => p.imageUrl).filter(Boolean)
    for (const expected of expectedImages) {
      // expected already has prefix if filePrefix, e.g., tadv2-reading_part2_q9_to_q16.png
      const expectedFileName = expected
      // Find actual source file that matches q range suffix
      const suffix = expectedFileName.includes("q") ? expectedFileName.slice(expectedFileName.indexOf("q")) : expectedFileName
      let srcFile = allFiles.find((f) => f.endsWith(suffix))
      if (!srcFile) srcFile = allFiles.find((f) => f.endsWith(".png") && f.includes(suffix.slice(0, 5)))
      if (!srcFile) {
        console.warn(`[sync-data] missing image for ${expected}, tried suffix ${suffix}`)
        continue
      }
      copyFile(join(srcDir, srcFile), join(publicData, expectedFileName))
    }
    // Also copy any remaining png not yet copied (only for 01, for 02/03 expected files already handled)
    if (!filePrefix) {
      for (const file of allFiles) {
        if (file.endsWith(".png")) {
          const destFile = file
          const destPath = join(publicData, destFile)
          try {
            statSync(destPath)
          } catch {
            copyFile(join(srcDir, file), destPath)
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[sync-data] TADV ${dept} sync warning:`, e.message)
  }
}

// 01 - keep original names for backward compat (no prefix)
syncTadv("01", "tadv", "")
// 02 and 03 with prefix to avoid collision
syncTadv("02", "tadv2", "tadv2")
syncTadv("03", "tadv3", "tadv3")

console.log("[sync-data] done")
