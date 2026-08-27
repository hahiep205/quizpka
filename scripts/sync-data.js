import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
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

ensureDir(publicData)

function syncJsonDirectory(category) {
  const sourceDirectory = join(dataRoot, category)
  if (!existsSync(sourceDirectory)) return
  for (const file of readdirSync(sourceDirectory)) {
    if (file.endsWith(".json")) copyFile(join(sourceDirectory, file), join(publicData, file))
  }
}

function syncTadv(dept, destPrefix, filePrefix) {
  const srcDir = join(dataRoot, "TADV", dept)
  if (!existsSync(srcDir)) return
  const destReading = join(publicData, `${destPrefix}-reading.json`)
  const destListening = join(publicData, `${destPrefix}-listening.json`)
  const readingSrc = join(srcDir, "reading.json")
  const listeningSrc = join(srcDir, "listening.json")
  if (!existsSync(readingSrc) || !existsSync(listeningSrc)) {
    throw new Error(`TADV ${dept} must provide both reading.json and listening.json`)
  }

  const readingData = JSON.parse(readFileSync(readingSrc, "utf8"))
  for (const part of readingData.parts ?? []) {
    if (part.imageUrl && filePrefix) part.imageUrl = `${filePrefix}-${part.imageUrl}`
  }
  ensureDir(dirname(destReading))
  writeFileSync(destReading, `${JSON.stringify(readingData, null, 2)}\n`, "utf8")
  console.log(`[sync-data] ${readingSrc.replace(root + "\\", "")} -> ${destReading.replace(root + "\\", "")} (patched)`)

  const listeningData = JSON.parse(readFileSync(listeningSrc, "utf8"))
  for (const part of listeningData.parts ?? []) {
    if (part.audioUrl && filePrefix) part.audioUrl = `${filePrefix}-${part.audioUrl}`
  }
  ensureDir(dirname(destListening))
  writeFileSync(destListening, `${JSON.stringify(listeningData, null, 2)}\n`, "utf8")
  console.log(`[sync-data] ${listeningSrc.replace(root + "\\", "")} -> ${destListening.replace(root + "\\", "")} (patched)`)

  for (const file of readdirSync(srcDir)) {
    if (!file.endsWith(".mp3") && !file.endsWith(".png")) continue
    const destination = join(publicData, filePrefix ? `${filePrefix}-${file}` : file)
    if (!filePrefix && existsSync(destination) && statSync(destination).size > 0) continue
    copyFile(join(srcDir, file), destination)
  }
}

if (!existsSync(dataRoot)) {
  console.log("[sync-data] source data directory is absent; using committed public data")
} else {
  syncJsonDirectory("General")
  syncJsonDirectory("Major")
  syncTadv("01", "tadv", "")
  syncTadv("02", "tadv2", "tadv2")
  syncTadv("03", "tadv3", "tadv3")
}
