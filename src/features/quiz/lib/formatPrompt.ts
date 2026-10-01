/**
 * Normalize a question prompt for readability. Containers render prompts with
 * `whitespace-pre-line`, so `\n\n` becomes a paragraph break. Covers:
 * - note/example labels ("Lưu ý:", "Ví dụ:", "Note:", "Example:")
 * - definition/task openers ("Trong đó:", "Khi đó", "Dựa vào bảng …",
 *   "Số liệu … bảng sau:")
 * - sub-task heads ("Hệ số xác định …", "Các tham số …",
 *   "Kết quả được làm tròn …", `\(a=\)`, `R2=`, `A =`)
 * - inline STT data tables ("STT h1 h2 1 v11 v12 2 …" → one row per line)
 * Idempotent: safe to run on already-formatted text.
 */
import { replaceCanvasEquationImages } from "@/lib/canvasEquations"
const MARKER_PATTERN = /\s*((?:lưu ý|ví dụ|note|example)\s*:)/gi
const TRONG_DO_PATTERN = /\s*((?:trong đó)\s*:)/gi
const KHI_DO_PATTERN = /(^|\s+)(Khi đó)(?=[\s,.])/g
const DUA_VAO_BANG_PATTERN = /\s*(dựa (?:vào|trên) bảng[^.:]*)/gi
const SO_LIEU_BANG_PATTERN = /\s*(số liệu[^.:]*bảng sau\s*:)/gi
const TIEU_DE_PATTERN = /([.?!…\n]\s*)((?:hệ số xác định|các tham số)[^.:]*)/gi
const KET_QUA_PATTERN = /([.?!…\n]\s*)((?:kết quả được làm tròn)[^.:]*)/gi
const MATH_AB_PATTERN = /([.:]\s*)(\\\([aAbB]\s*=.*?\\\))/g
const LETTER_EQ_PATTERN = /([:.)\]\n]\s*)([A-Za-z]\d*\s*=)/g

const NUMBER_TOKEN = /^-?\d+([.,]\d+)?$/

function isNumberToken(token: string): boolean {
  return NUMBER_TOKEN.test(token.replace(/[.,;:!?]+$/, ""))
}

/** Column count whose rows all start with 1..R (the STT column), else null. */
function inferTableColumns(numbers: string[]): number | null {
  const total = numbers.length
  if (total < 6) return null
  for (let columns = 2; columns <= 8; columns++) {
    if (total % columns !== 0) continue
    const rows = total / columns
    if (rows < 2) continue
    let sequential = true
    for (let row = 0; row < rows; row++) {
      if (Number(numbers[row * columns]) !== row + 1) {
        sequential = false
        break
      }
    }
    if (sequential) return columns
  }
  return null
}

/**
 * Rewrite the first inline "STT header numbers…" run as one row per line:
 * "STT h1 h2\n1 | v11 | v12\n…". Leaves text untouched when the numbers do
 * not form a sequential STT table.
 */
function formatDataTables(text: string): string {
  let output = text
  let cursor = 0
  for (;;) {
    const head = /\bSTT\b/.exec(output.slice(cursor))
    if (!head) return output
    const tableStart = cursor + head.index
    const tokens = output.slice(tableStart).split(/\s+/)
    // tokens[0] === "STT"; header runs until the first number token.
    let headerEnd = 1
    while (headerEnd < tokens.length && !isNumberToken(tokens[headerEnd])) headerEnd++
    const numbers: string[] = []
    let end = headerEnd
    while (end < tokens.length && isNumberToken(tokens[end])) {
      numbers.push(tokens[end].replace(/[.,;:!?]+$/, ""))
      end++
    }
    const columns = inferTableColumns(numbers)
    if (columns === null) {
      cursor = tableStart + 3
      continue
    }
    const headerBlob = tokens.slice(1, headerEnd).join(" ")
    const headLine = headerBlob ? `STT | ${headerBlob}` : "STT"
    const rows: string[] = []
    for (let row = 0; row < numbers.length / columns; row++) {
      rows.push(numbers.slice(row * columns, (row + 1) * columns).join(" | "))
    }
    const consumed = tokens.slice(0, end).join(" ")
    output = `${output.slice(0, tableStart)}\n\n${headLine}\n${rows.join("\n")}\n\n${output.slice(tableStart + consumed.length)}`
    cursor = tableStart + 1
  }
}

export function formatPromptText(prompt: string): string {
  if (!prompt) return prompt
  const broken = replaceCanvasEquationImages(prompt)
    .replace(MARKER_PATTERN, "\n\n$1")
    .replace(TRONG_DO_PATTERN, "\n\n$1")
    .replace(KHI_DO_PATTERN, "$1\n\n$2")
    .replace(DUA_VAO_BANG_PATTERN, "\n\n$1")
    .replace(SO_LIEU_BANG_PATTERN, "\n\n$1")
    .replace(TIEU_DE_PATTERN, "$1\n\n$2")
    .replace(KET_QUA_PATTERN, "$1\n\n$2")
    .replace(MATH_AB_PATTERN, "$1\n\n$2")
    .replace(LETTER_EQ_PATTERN, "$1\n\n$2")
  return formatDataTables(broken)
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n+$/, "")
}
