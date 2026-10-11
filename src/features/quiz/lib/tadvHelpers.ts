import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { mapBankQuestions, shuffle } from "@/features/quiz/lib/quizHelpers"
import type { BankFile, BankPart, BankQuestion, Question } from "@/features/quiz/model/quiz.types"
import { toMediaUrl } from "@/lib/mediaUrl"

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const

function correctKey(item: BankQuestion): string {
  return item.correct_answer ?? item.answer
}

/** Section matches the sidebar convention (Parts 1-2 Listening, rest Reading). */
export function tadvSectionForPart(partNumber: number): "Listening" | "Reading" {
  return partNumber === 1 || partNumber === 2 ? "Listening" : "Reading"
}

/**
 * Builds the short + detailed explanation from the TOEIC-style rich fields
 * (analysis, vocabulary, grammar_point, strategy, transcript,
 * image_description). Section headers intentionally mirror the TOEIC adapter
 * so DetailedAnalysisContent renders them with the same rich cards.
 */
function explanationFor(item: BankQuestion): Pick<Question, "explanation" | "detailedExplanation"> {
  const correct = correctKey(item)
  const transcript = item.transcript ?? item.audio_transcript
  const analysisLines = OPTION_KEYS.flatMap((key) => {
    const reason = item.analysis?.[key]?.reason
    return reason ? [`${key} ${key === correct ? "✓ Đúng" : "✗ Sai"}: ${reason}`] : []
  })
  const details = [
    analysisLines.length ? `Phân tích lựa chọn:\n${analysisLines.join("\n")}` : undefined,
    item.vocabulary?.length
      ? `Từ vựng:\n${item.vocabulary.map((word) => `- ${word.phrase}: ${word.meaning}${word.paraphrases?.length ? ` (${word.paraphrases.join(", ")})` : ""}`).join("\n")}`
      : undefined,
    item.grammar_point ? `Điểm ngữ pháp: ${item.grammar_point}` : undefined,
    item.strategy?.length ? `Chiến lược:\n${item.strategy.map((strategy, index) => `${index + 1}. ${strategy}`).join("\n")}` : undefined,
    transcript ? `Transcript:\n${transcript}` : undefined,
    item.image_description ? `Mô tả hình ảnh: ${item.image_description}` : undefined,
  ].filter((part): part is string => part !== undefined)
  const explanation = item.explainAnswer ?? (correct ? item.analysis?.[correct]?.reason : undefined) ?? item.correct_text ?? transcript ?? item.image_description
  const detailedExplanation = details.length ? details.join("\n\n") : undefined
  return detailedExplanation === explanation ? { explanation } : { explanation, detailedExplanation }
}

function toQuestion(
  examId: string,
  part: BankPart,
  item: BankQuestion,
  index: number,
  setup: QuizSetupValues,
): Question {
  const answer = correctKey(item)
  const pairs = OPTION_KEYS.filter((key) => item.options?.[key] !== undefined).map((key) => ({
    key,
    text: item.options?.[key] ?? "",
    isCorrect: key === answer,
  }))
  const orderedPairs = setup.answerOrder === "random" ? shuffle(pairs) : pairs
  const partAudioUrl = toMediaUrl(part.audioUrl)
  const itemImageUrl = toMediaUrl(item.imageUrl) ?? toMediaUrl(item.image) ?? toMediaUrl(part.imageUrl)
  return {
    id: `${examId}-tadv-part${part.partNumber}-${item.id ?? index + 1}`,
    prompt: item.question,
    options: orderedPairs.map((pair) => pair.text),
    correctIndex: pairs.length ? Math.max(0, orderedPairs.findIndex((pair) => pair.isCorrect)) : undefined,
    acceptedAnswers: pairs.length || !answer ? undefined : [answer.trim().toLowerCase()],
    questionType: item.type,
    grammarPoint: item.grammar_point,
    ...explanationFor(item),
    partTitle: part.partTitle,
    section: tadvSectionForPart(part.partNumber),
    instruction: part.instruction,
    passage: part.passage ?? undefined,
    referenceNotices: part.referenceNotices,
    audioUrl: partAudioUrl,
    audioTimestamp: item.audioTimestamp,
    imageUrl: itemImageUrl,
  }
}

/**
 * Converts a TADV bank (parts with TOEIC-style rich question fields) into the
 * application question model. Flat banks fall back to the generic mapper.
 */
export function adaptTadvBank(bank: BankFile, examId: string, setup: QuizSetupValues): Question[] {
  if (!bank.parts?.length) return mapBankQuestions(bank, examId, setup)
  const partGroups = bank.parts.map((part) =>
    part.questions.map((item, index) => toQuestion(examId, part, item, index, setup)),
  )
  return (setup.questionOrder === "random" ? shuffle(partGroups) : partGroups).flat()
}
