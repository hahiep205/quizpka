import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { getToeicScopeOption, type ToeicScope } from "@/data/toeic"
import { shuffle } from "@/features/quiz/lib/quizHelpers"
import { getToeicPartFromFile, parseToeicBank, ToeicDataError } from "@/features/quiz/lib/toeicSchema"
import type { Question } from "@/features/quiz/model/quiz.types"
import type { RawToeicBank, RawToeicQuestion } from "@/features/quiz/model/toeic.types"

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const

function getDirectory(file: string) {
  const index = file.lastIndexOf("/")
  return index >= 0 ? file.slice(0, index) : ""
}

function assetUrl(directory: string, filename?: string) {
  return filename ? `${directory}/${filename}` : undefined
}

function explanationFor(item: RawToeicQuestion): Pick<Question, "explanation" | "detailedExplanation"> {
  const correct = item.correct_answer ?? item.answer
  const analysisLines = OPTION_KEYS.flatMap((key) => {
    const reason = item.analysis?.[key]?.reason
    return reason ? [`${key} ${key === correct ? "✓ Đúng" : "✗ Sai"}: ${reason}`] : []
  })
  const details = [
    analysisLines.length ? `Phân tích lựa chọn:\n${analysisLines.join("\n")}` : undefined,
    item.vocabulary?.length ? `Từ vựng:\n${item.vocabulary.map((word) => `- ${word.phrase}: ${word.meaning}${word.paraphrases?.length ? ` (${word.paraphrases.join(", ")})` : ""}`).join("\n")}` : undefined,
    item.grammar_point ? `Điểm ngữ pháp: ${item.grammar_point}` : undefined,
    item.strategy?.length ? `Chiến lược:\n${item.strategy.map((strategy, index) => `${index + 1}. ${strategy}`).join("\n")}` : undefined,
    item.audio_transcript ? `Transcript:\n${item.audio_transcript}` : undefined,
    item.image_description ? `Mô tả hình ảnh: ${item.image_description}` : undefined,
  ].filter((part): part is string => part !== undefined)
  const explanation = item.explainAnswer ?? (correct ? item.analysis?.[correct as "A" | "B" | "C" | "D" | "E" | "F"]?.reason : undefined) ?? item.correct_text ?? item.audio_transcript
  const detailedExplanation = details.length ? details.join("\n\n") : undefined
  return detailedExplanation === explanation ? { explanation } : { explanation, detailedExplanation }
}

function toQuestion(examId: string, item: RawToeicQuestion, setup: QuizSetupValues, context: Omit<Question, "id" | "prompt" | "options" | "correctIndex" | "acceptedAnswers" | "explanation" | "detailedExplanation">): Question {
  const answer = item.correct_answer ?? item.answer
  const pairs = OPTION_KEYS.filter((key) => item.options?.[key] !== undefined).map((key) => ({ key, text: item.options?.[key] ?? "", isCorrect: key === answer }))
  const orderedPairs = setup.answerOrder === "random" ? shuffle(pairs) : pairs
  return {
    id: `${examId}-${context.section ?? "toeic"}-${(context.partTitle ?? "part").replace(/\s+/g, "-")}-${item.id ?? "unknown"}`,
    prompt: item.prompt ?? item.question ?? "",
    options: orderedPairs.map((pair) => pair.text),
    correctIndex: pairs.length ? Math.max(0, orderedPairs.findIndex((pair) => pair.isCorrect)) : undefined,
    acceptedAnswers: pairs.length || !answer ? undefined : [answer.trim().toLowerCase()],
    questionType: item.type,
    grammarPoint: item.grammar_point,
    ...explanationFor(item),
    ...context,
  }
}

function part7Passage(group: { passage?: string; passages?: Array<{ title?: string; documentId?: string | number; documentType?: string; content?: string; text?: string }> }) {
  if (group.passage?.trim()) return group.passage
  return (group.passages ?? []).map((document, index) => `${document.title ?? `Document ${document.documentId ?? index + 1}`}${document.documentType ? ` [${document.documentType}]` : ""}\n${document.content ?? document.text ?? ""}`).join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n")
}

/** Converts one validated TOEIC bank into the application question model. */
export function adaptToeicBank(bank: RawToeicBank, file: string, examId: string, setup: QuizSetupValues): Question[] {
  const directory = getDirectory(file)
  if (bank.part === 1) return bank.data.map((item, index) => toQuestion(examId, item, setup, { partTitle: `Listening - Part 1 - Q${item.id ?? index + 1}`, section: "Listening", audioUrl: assetUrl(directory, item.audio), imageUrl: assetUrl(directory, item.image) }))
  if (bank.part === 2) return bank.data.map((item, index) => toQuestion(examId, item, setup, { partTitle: `Listening - Part 2 - Q${item.id ?? index + 1}`, section: "Listening", audioUrl: assetUrl(directory, item.audio) }))
  if (bank.part === 5) return bank.data.map((item, index) => toQuestion(examId, item, setup, { partTitle: `Reading - Part 5 - Q${item.id ?? index + 1}`, section: "Reading" }))
  if (bank.part === 3 || bank.part === 4) return bank.data.flatMap((group, groupIndex) => group.questions.map((item) => toQuestion(examId, item, setup, { partTitle: `Listening - Part ${bank.part} - Group ${group.group ?? groupIndex + 1}`, section: "Listening", instruction: bank.part === 3 ? "Listen to the conversation and answer three questions." : "Listen to the talk and answer three questions.", audioUrl: assetUrl(directory, group.audio), imageUrl: assetUrl(directory, group.image), passage: item.audio_transcript ? `Transcript: ${item.audio_transcript}` : undefined })))
  if (bank.part === 6) return bank.data.flatMap((group, groupIndex) => group.questions.map((item) => toQuestion(examId, item, setup, { partTitle: `Reading - Part 6 - Group ${group.group_id ?? groupIndex + 1}`, section: "Reading", passage: group.passage ?? "" })))
  return bank.data.groups.flatMap((group, groupIndex) => group.questions.map((item) => toQuestion(examId, item, setup, { partTitle: `Reading - Part 7 - Group ${group.groupId ?? group.group_id ?? groupIndex + 1}`, section: "Reading", passage: part7Passage(group) })))
}

export async function loadToeicQuestions(scope: ToeicScope, examId: string, setup: QuizSetupValues, signal?: AbortSignal): Promise<Question[]> {
  const option = getToeicScopeOption(scope, examId)
  if (!option) throw new Error(`Unknown TOEIC scope "${scope}" for test "${examId}"`)
  const banks = await Promise.all(option.files.map(async (file) => {
    const part = getToeicPartFromFile(file)
    let response: Response
    try {
      response = await fetch(file, { signal })
    } catch (error) {
      throw new ToeicDataError(file, part, `network request failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (!response.ok) throw new ToeicDataError(file, part, `request returned HTTP ${response.status}`)
    let json: unknown
    try {
      json = await response.json()
    } catch {
      throw new ToeicDataError(file, part, "response is not valid JSON")
    }
    return adaptToeicBank(parseToeicBank(json, file), file, examId, setup)
  }))
  const questions = banks.flat()
  if (!questions.length) throw new Error(`TOEIC scope "${scope}" for test "${examId}" contains no questions`)
  return setup.questionOrder === "random" ? shuffle(questions) : questions
}
