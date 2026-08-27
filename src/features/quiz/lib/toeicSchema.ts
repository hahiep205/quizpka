import type { RawToeicBank, RawToeicPart7, RawToeicQuestion } from "@/features/quiz/model/toeic.types"

type UnknownRecord = Record<string, unknown>

export class ToeicDataError extends Error {
  readonly file: string
  readonly part: number

  constructor(file: string, part: number, detail: string) {
    super(`TOEIC data validation failed (Part ${part}, ${file}): ${detail}`)
    this.name = "ToeicDataError"
    this.file = file
    this.part = part
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function fail(file: string, part: number, detail: string): never {
  throw new ToeicDataError(file, part, detail)
}

function validateQuestion(value: unknown, file: string, part: number, path: string): asserts value is RawToeicQuestion {
  if (!isRecord(value)) fail(file, part, `${path} must be an object`)
  if (typeof value.question !== "string" && typeof value.prompt !== "string") {
    fail(file, part, `${path} requires question or prompt`)
  }
  if (value.options !== undefined && !isRecord(value.options)) fail(file, part, `${path}.options must be an object`)
  if (value.answer !== undefined && typeof value.answer !== "string") fail(file, part, `${path}.answer must be a string`)
  if (value.correct_answer !== undefined && typeof value.correct_answer !== "string") fail(file, part, `${path}.correct_answer must be a string`)
}

function validateQuestionArray(value: unknown, file: string, part: number, path: string): asserts value is RawToeicQuestion[] {
  if (!Array.isArray(value)) fail(file, part, `${path} must be an array`)
  value.forEach((question, index) => validateQuestion(question, file, part, `${path}[${index}]`))
}

export function getToeicPartFromFile(file: string): number {
  const match = file.match(/\/Part([1-7])\//i)
  if (!match) throw new Error(`Cannot infer TOEIC part from path: ${file}`)
  return Number(match[1])
}

export function parseToeicBank(value: unknown, file: string): RawToeicBank {
  const part = getToeicPartFromFile(file)
  if (part === 1 || part === 2 || part === 5) {
    validateQuestionArray(value, file, part, "root")
    return { part, data: value }
  }
  if (part === 3 || part === 4 || part === 6) {
    if (!Array.isArray(value)) fail(file, part, "root must be an array of groups")
    value.forEach((group, index) => {
      if (!isRecord(group)) fail(file, part, `root[${index}] must be an object`)
      validateQuestionArray(group.questions, file, part, `root[${index}].questions`)
    })
    return { part, data: value }
  }
  if (!isRecord(value)) fail(file, part, "root must be an object with groups")
  if (!Array.isArray(value.groups)) fail(file, part, "root.groups must be an array")
  value.groups.forEach((group, index) => {
    if (!isRecord(group)) fail(file, part, `root.groups[${index}] must be an object`)
    validateQuestionArray(group.questions, file, part, `root.groups[${index}].questions`)
  })
  return { part: 7, data: value as RawToeicPart7 }
}
