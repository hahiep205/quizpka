import type { BankFile, BankPart, BankQuestion } from "@/features/quiz/model/quiz.types"

type UnknownRecord = Record<string, unknown>

export class QuestionBankDataError extends Error {
  readonly source: string

  constructor(source: string, detail: string) {
    super(`Question bank validation failed (${source}): ${detail}`)
    this.name = "QuestionBankDataError"
    this.source = source
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function fail(source: string, detail: string): never {
  throw new QuestionBankDataError(source, detail)
}

function parseQuestion(value: unknown, source: string, path: string): BankQuestion {
  if (!isRecord(value)) fail(source, `${path} must be an object`)
  if ((typeof value.id !== "string" && typeof value.id !== "number") || typeof value.question !== "string" || typeof value.answer !== "string") {
    fail(source, `${path} requires id, question, and answer`)
  }
  if (value.options !== undefined && !isRecord(value.options)) fail(source, `${path}.options must be an object`)
  if (isRecord(value.options) && !Object.hasOwn(value.options, value.answer)) {
    fail(source, `${path} answer is not present in options`)
  }
  return value as BankQuestion
}

function parseQuestions(value: unknown, source: string, path: string): BankQuestion[] {
  if (!Array.isArray(value)) fail(source, `${path} must be an array`)
  return value.map((question, index) => parseQuestion(question, source, `${path}[${index}]`))
}

function parsePart(value: unknown, source: string, path: string): BankPart {
  if (!isRecord(value)) fail(source, `${path} must be an object`)
  if (typeof value.partNumber !== "number" || typeof value.partTitle !== "string") {
    fail(source, `${path} requires partNumber and partTitle`)
  }
  return { ...value, partNumber: value.partNumber, partTitle: value.partTitle, questions: parseQuestions(value.questions, source, `${path}.questions`) } as BankPart
}

/** Validates the public general/TADV bank format before it reaches the quiz UI. */
export function parseQuestionBank(value: unknown, source: string): BankFile {
  if (!isRecord(value)) fail(source, "root must be an object")
  const questions = value.questions === undefined ? undefined : parseQuestions(value.questions, source, "questions")
  const parts = value.parts === undefined
    ? undefined
    : Array.isArray(value.parts)
      ? value.parts.map((part, index) => parsePart(part, source, `parts[${index}]`))
      : fail(source, "parts must be an array")
  if (!questions && !parts) fail(source, "root must provide questions or parts")
  return { title: typeof value.title === "string" ? value.title : undefined, questions, parts }
}
