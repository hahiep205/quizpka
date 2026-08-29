import type { Question } from "@/features/quiz/model/quiz.types"

/** Taxonomy keys for classifying TOEIC result categories. */
export type ToeicCategoryKey =
  | "action"
  | "state"
  | "question_response"
  | "main_idea"
  | "detail"
  | "next_action"
  | "graphic"
  | "part_of_speech"
  | "vocabulary"
  | "conjunction"
  | "tense"
  | "participle"
  | "preposition"
  | "pronoun"
  | "sentence_insertion"
  | "relative_clause"
  | "verb_form"
  | "purpose"
  | "inference"
  | "location"
  | "time"
  | "subject"
  | "reason"
  | "paragraph_link"

export const TOEIC_CATEGORY_LABELS: Record<ToeicCategoryKey, { en: string; vi: string }> = {
  action: { en: "Action description", vi: "Mô tả hành động trong tranh" },
  state: { en: "State description", vi: "Mô tả trạng thái trong tranh" },
  question_response: { en: "Question response", vi: "Question response" },
  main_idea: { en: "Main idea / Topic", vi: "Chủ đề / Ý chính" },
  detail: { en: "Detailed information", vi: "Thông tin chi tiết" },
  next_action: { en: "Next action", vi: "Hành động tiếp theo" },
  graphic: { en: "Graphic comparison", vi: "Đối chiếu hình ảnh / sơ đồ" },
  part_of_speech: { en: "Part of speech", vi: "Từ loại" },
  vocabulary: { en: "Vocabulary", vi: "Từ vựng" },
  conjunction: { en: "Conjunctions", vi: "Liên từ" },
  tense: { en: "Tense", vi: "Tense" },
  participle: { en: "Participle", vi: "Participle" },
  preposition: { en: "Prepositions", vi: "Giới từ" },
  pronoun: { en: "Pronouns", vi: "Đại từ" },
  sentence_insertion: { en: "Sentence insertion", vi: "Điền câu vào văn bản" },
  relative_clause: { en: "Relative clauses", vi: "Mệnh đề quan hệ" },
  verb_form: { en: "Verb form", vi: "Động từ / Verb form" },
  purpose: { en: "Purpose", vi: "Mục đích" },
  inference: { en: "Inference questions", vi: "Câu hỏi suy luận" },
  location: { en: "Location", vi: "Địa điểm & vị trí" },
  time: { en: "Time-related", vi: "Hỏi về thời gian" },
  subject: { en: "Specific subject info", vi: "Thông tin đối tượng cụ thể" },
  reason: { en: "Reason / Cause", vi: "Lý do / Nguyên nhân" },
  paragraph_link: { en: "Paragraph cohesion", vi: "Liên kết đoạn văn" },
}

export function getToeicCategoryLabel(key: ToeicCategoryKey, lang: "en" | "vi"): string {
  return TOEIC_CATEGORY_LABELS[key][lang]
}

/** Preferred display order for the category table (Listening grammar, then Reading). */
export const TOEIC_CATEGORY_ORDER: ToeicCategoryKey[] = [
  "action",
  "state",
  "question_response",
  "main_idea",
  "detail",
  "next_action",
  "graphic",
  "part_of_speech",
  "vocabulary",
  "conjunction",
  "tense",
  "participle",
  "preposition",
  "pronoun",
  "sentence_insertion",
  "relative_clause",
  "verb_form",
  "purpose",
  "inference",
  "location",
  "time",
  "subject",
  "reason",
  "paragraph_link",
]

export function getToeicPartNumber(question: Question): number | null {
  const match = question.partTitle?.match(/Part\s+(\d+)/i)
  return match ? Number(match[1]) : null
}

/** State-like descriptions (passive / stative) for Part 1 photographs. */
const STATE_CLUE =
  /stacked|mounted|hung\b|hanging|placed|located|displayed|sitting|standing|wearing|lying\b|parked|positioned|arranged|piled|is full|filled with|has been|has 's been/i

function classifyPart1(question: Question): ToeicCategoryKey {
  const correctText = question.options[question.correctIndex ?? 0] ?? ""
  return STATE_CLUE.test(correctText) ? "state" : "action"
}

/** Ordered grammar-point rules for Parts 5 & 6 (first match wins). */
const GRAMMAR_RULES: Array<{ test: RegExp; key: ToeicCategoryKey }> = [
  { test: /sentence insertion/i, key: "sentence_insertion" },
  { test: /conjunction|conjunctive|conditional|transition|contrast|although|despite|unless|so that/i, key: "conjunction" },
  { test: /reduced relative|participle/i, key: "participle" },
  { test: /relative clause/i, key: "relative_clause" },
  { test: /reflexive|quantifier|determiner|pronoun/i, key: "pronoun" },
  { test: /subjunctive|imperative/i, key: "verb_form" },
  { test: /future|present perfect|tense|passive|past\b/i, key: "tense" },
  { test: /vocabulary|collocation|verb choice|in context|verb-object/i, key: "vocabulary" },
  { test: /preposition/i, key: "preposition" },
  { test: /part of speech|adverb|adjective|noun|comparative|infinitive|article/i, key: "part_of_speech" },
]

function classifyGrammar(question: Question): ToeicCategoryKey {
  if (question.questionType === "sentence_insertion") return "sentence_insertion"
  const grammarPoint = question.grammarPoint ?? ""
  for (const rule of GRAMMAR_RULES) {
    if (rule.test.test(grammarPoint)) return rule.key
  }
  return "vocabulary"
}

/** Ordered keyword rules for Parts 3, 4 & 7 reading questions (first match wins). */
const READING_RULES: Array<{ test: RegExp; key: ToeicCategoryKey }> = [
  { test: /sentence best belong|best completes|inserted into/i, key: "sentence_insertion" },
  { test: /paragraph|refer to|preceding|following paragraph|cohesion|transition/i, key: "paragraph_link" },
  { test: /implied|infer|suggest|probably true/i, key: "inference" },
  { test: /why (did|does|is|are|was|were|has|have|had|will|would|can|could|do|does|should)?[\s\w'’]* (contact|write|send|email|call|visit|request)|purpose of the/i, key: "purpose" },
  { test: /^why\b| why\b/i, key: "reason" },
  { test: /where\b/i, key: "location" },
  { test: /when\b|by what date|by when|what time|how long|which day|what day|at what/i, key: "time" },
  { test: /main topic|main subject|primary focus|mostly about|mainly about|mainly discussing|mainly talking about|described in|do the speakers (mainly|mostly)/i, key: "main_idea" },
  { test: /^who\b| who\b/i, key: "subject" },
  { test: /do next|next step|next action|what should|next\b/i, key: "next_action" },
  { test: /look at the graphic|according to the graphic|graphic/i, key: "graphic" },
]

function classifyReading(question: Question): ToeicCategoryKey {
  const text = `${question.prompt} ${question.options.join(" ")}`
  for (const rule of READING_RULES) {
    if (rule.test.test(text)) return rule.key
  }
  return "detail"
}

/** Classifies a single TOEIC question into one of the result categories. */
export function classifyToeicQuestion(question: Question): ToeicCategoryKey {
  const part = getToeicPartNumber(question)
  if (part === 1) return classifyPart1(question)
  if (part === 2) return "question_response"
  if (part === 5 || part === 6) return classifyGrammar(question)
  if (part === 3 || part === 4 || part === 7) return classifyReading(question)
  return "detail"
}
