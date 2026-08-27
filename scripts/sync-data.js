import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const dataRoot = join(root, "data")
const publicData = join(root, "public", "data")

/** General banks are grouped per subject so split files that reuse the same name
 *  (e.g. chuong_1.json, cau_hoi_suu_tam.json) don't collide: each subfolder
 *  data/General/<subject> is mirrored into public/data/<subject>/, preserving
 *  nested folders such as triet-hoc-mac-lenin/{2tc,3tc}. */

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function copyFile(src, dest) {
  ensureDir(dirname(dest))
  cpSync(src, dest)
  console.log(`[sync-data] ${src.replace(root + "\\", "")} -> ${dest.replace(root + "\\", "")}`)
}

ensureDir(publicData)

/** Destination subfolder (relative to public/data) for each known Major bank file. */
const MAJOR_FOLDER_BY_FILE = {
  "bo_cau_hoi_bao_mat_ung_dung_he_thong_2.json": "bao-mat-ung-dung-va-he-thong",
}

function copyJsonTree(sourceDirectory, destDirectory) {
  ensureDir(destDirectory)
  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    const source = join(sourceDirectory, entry.name)
    if (entry.isDirectory()) {
      copyJsonTree(source, join(destDirectory, entry.name))
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      copyFile(source, join(destDirectory, entry.name))
    }
  }
}

function syncGeneral() {
  const sourceDirectory = join(dataRoot, "General")
  if (!existsSync(sourceDirectory)) return
  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copyJsonTree(join(sourceDirectory, entry.name), join(publicData, entry.name))
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      console.warn(`[sync-data] ignoring loose file ${entry.name} under General/: group banks under data/General/<subject>/`)
    }
  }
}

function syncMajor() {
  const sourceDirectory = join(dataRoot, "Major")
  if (!existsSync(sourceDirectory)) return
  for (const file of readdirSync(sourceDirectory)) {
    if (!file.endsWith(".json")) continue
    const folder = MAJOR_FOLDER_BY_FILE[file] ?? "major"
    copyFile(join(sourceDirectory, file), join(publicData, folder, file))
  }
}

function syncTadv(dept, destPrefix, filePrefix) {
  const srcDir = join(dataRoot, "TADV", dept)
  if (!existsSync(srcDir)) return
  const destDir = join(publicData, "tadv")
  const destReading = join(destDir, `${destPrefix}-reading.json`)
  const destListening = join(destDir, `${destPrefix}-listening.json`)
  const readingSrc = join(srcDir, "reading.json")
  const listeningSrc = join(srcDir, "listening.json")
  if (!existsSync(readingSrc) || !existsSync(listeningSrc)) {
    throw new Error(`TADV ${dept} must provide both reading.json and listening.json`)
  }

  // Published media paths are relative to /data, so they carry the tadv/ subfolder prefix.
  const mediaPrefix = `tadv/${filePrefix ? `${filePrefix}-` : ""}`

  const readingData = JSON.parse(readFileSync(readingSrc, "utf8"))
  for (const part of readingData.parts ?? []) {
    if (part.imageUrl) part.imageUrl = `${mediaPrefix}${part.imageUrl}`
  }
  ensureDir(dirname(destReading))
  writeFileSync(destReading, `${JSON.stringify(readingData, null, 2)}\n`, "utf8")
  console.log(`[sync-data] ${readingSrc.replace(root + "\\", "")} -> ${destReading.replace(root + "\\", "")} (patched)`)

  const listeningData = JSON.parse(readFileSync(listeningSrc, "utf8"))
  for (const part of listeningData.parts ?? []) {
    if (part.audioUrl) part.audioUrl = `${mediaPrefix}${part.audioUrl}`
  }
  ensureDir(dirname(destListening))
  writeFileSync(destListening, `${JSON.stringify(listeningData, null, 2)}\n`, "utf8")
  console.log(`[sync-data] ${listeningSrc.replace(root + "\\", "")} -> ${destListening.replace(root + "\\", "")} (patched)`)

  for (const file of readdirSync(srcDir)) {
    if (!file.endsWith(".mp3") && !file.endsWith(".png")) continue
    const destination = join(destDir, filePrefix ? `${filePrefix}-${file}` : file)
    if (!filePrefix && existsSync(destination) && statSync(destination).size > 0) continue
    copyFile(join(srcDir, file), destination)
  }
}

if (!existsSync(dataRoot)) {
  console.log("[sync-data] source data directory is absent; using committed public data")
} else {
  syncGeneral()
  syncMajor()
  syncTadv("01", "tadv", "")
  syncTadv("02", "tadv2", "tadv2")
  syncTadv("03", "tadv3", "tadv3")
}




