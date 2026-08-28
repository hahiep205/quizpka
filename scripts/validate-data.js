import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDirectory, "..")
const publicDataDirectory = join(projectRoot, "public", "data")
const optionKeys = new Set(["A", "B", "C", "D", "E", "F"])
const toeicPartQuestionCounts = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 }
let failures = 0

function fail(file, message) {
  failures += 1
  console.error(`[validate-data] ${relative(projectRoot, file)}: ${message}`)
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    return entry.isDirectory() ? walk(entryPath) : [entryPath]
  })
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validateQuestion(question, location, file) {
  if (!isRecord(question)) return fail(file, `${location} must be an object`)
  if (typeof question.question !== "string" && typeof question.prompt !== "string") fail(file, `${location} must provide question or prompt text`)
  if (typeof question.answer !== "string" && typeof question.correct_answer !== "string") fail(file, `${location} must provide answer or correct_answer`)
  if (question.options !== undefined) {
    if (!isRecord(question.options)) fail(file, `${location}.options must be an object`)
      else if (Object.keys(question.options).some((key) => !optionKeys.has(key))) fail(file, `${location}.options contains an unsupported option key`)
      else {
        const answer = question.correct_answer ?? question.answer
        if (typeof answer === "string" && !Object.hasOwn(question.options, answer)) fail(file, `${location} answer is not present in options`)
      }
  }
}

function validateQuestionArray(value, location, file) {
  if (!Array.isArray(value)) return fail(file, `${location} must be an array`)
  value.forEach((question, index) => validateQuestion(question, `${location}[${index}]`, file))
  const ids = value.map((question) => isRecord(question) ? question.id : undefined).filter((id) => typeof id === "string" || typeof id === "number")
  if (new Set(ids).size !== ids.length) fail(file, `${location} contains duplicate question IDs`)
  return value.length
}

function validateToeicBank(value, file, part) {
  let questionCount = 0
  if ([1, 2, 5].includes(part)) questionCount = validateQuestionArray(value, "root", file)
  if ([3, 4, 6].includes(part)) {
    if (!Array.isArray(value)) return fail(file, "root must be an array of groups")
    questionCount = value.reduce((total, group, index) => {
      if (!isRecord(group)) return fail(file, `root[${index}] must be an object`)
      return total + validateQuestionArray(group.questions, `root[${index}].questions`, file)
    }, 0)
  }
  if (part === 7) {
    if (!isRecord(value) || !Array.isArray(value.groups)) return fail(file, "root must be an object with a groups array")
    questionCount = value.groups.reduce((total, group, index) => {
      if (!isRecord(group)) return fail(file, `root.groups[${index}] must be an object`)
      return total + validateQuestionArray(group.questions, `root.groups[${index}].questions`, file)
    }, 0)
  }
  if (questionCount !== toeicPartQuestionCounts[part]) fail(file, `expected ${toeicPartQuestionCounts[part]} questions for Part ${part}, found ${questionCount}`)
}

function validateGeneralBank(value, file) {
  if (!isRecord(value)) return fail(file, "bank must be an object")
  let questionCount = 0
  if (value.questions !== undefined) questionCount = validateQuestionArray(value.questions, "questions", file)
  if (value.parts !== undefined) {
    if (!Array.isArray(value.parts)) return fail(file, "parts must be an array")
    questionCount = value.parts.reduce((total, part, index) => {
      if (!isRecord(part)) return fail(file, `parts[${index}] must be an object`)
      return total + validateQuestionArray(part.questions, `parts[${index}].questions`, file)
    }, 0)
  }
  if (value.questions === undefined && value.parts === undefined) fail(file, "bank must provide questions or parts")
  if (typeof value.totalQuestions === "number" && value.totalQuestions !== questionCount) fail(file, `totalQuestions is ${value.totalQuestions}, but found ${questionCount}`)
  if (typeof value.totalParts === "number" && Array.isArray(value.parts) && value.totalParts !== value.parts.length) fail(file, `totalParts is ${value.totalParts}, but found ${value.parts.length}`)
  validateGeneralMedia(value, file)
}

function validateGeneralMedia(value, file) {
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!isRecord(node)) return
    for (const key of ["audioUrl", "imageUrl", "image"]) {
      if (typeof node[key] === "string") {
        const assetPath = node[key].startsWith("/") ? join(projectRoot, "public", node[key]) : join(publicDataDirectory, node[key])
        if (!existsSync(assetPath)) fail(file, `referenced ${key} file is missing: ${node[key]}`)
      }
    }
    Object.values(node).forEach(visit)
  }
  visit(value)
}

function validateToeicMedia(value, file) {
  const directory = dirname(file)
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!isRecord(node)) return
    for (const key of ["audio", "image"]) {
      if (typeof node[key] === "string" && !existsSync(join(directory, node[key]))) fail(file, `referenced ${key} file is missing: ${node[key]}`)
    }
    Object.values(node).forEach(visit)
  }
  visit(value)
}

if (!existsSync(publicDataDirectory)) {
  fail(publicDataDirectory, "public data directory does not exist")
} else {
  for (const file of walk(publicDataDirectory).filter((path) => path.endsWith(".json"))) {
    let value
    try {
      value = JSON.parse(readFileSync(file, "utf8"))
    } catch (error) {
      fail(file, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    const partMatch = file.replaceAll("\\", "/").match(/\/toeic-test\/Test-\d+\/Part([1-7])\//)
    if (partMatch) {
      validateToeicBank(value, file, Number(partMatch[1]))
      validateToeicMedia(value, file)
    } else validateGeneralBank(value, file)
  }
}

if (failures > 0) {
  console.error(`[validate-data] failed with ${failures} issue(s)`)
  process.exitCode = 1
} else console.log("[validate-data] all public question banks and TOEIC media are valid")
