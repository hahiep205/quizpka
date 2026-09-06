export type Question = {
  id: string
  prompt: string
  options: string[]
  correctIndex?: number
  acceptedAnswers?: string[]
  explanation?: string
  detailedExplanation?: string
  partTitle?: string
  section?: "Listening" | "Reading"
  instruction?: string
  passage?: string
  referenceNotices?: Record<string, string>
  audioUrl?: string
  audioTimestamp?: string
  imageUrl?: string
  /** Original TOEIC question type (e.g. "picture_description", "question_response", "incomplete_sentence", "sentence_insertion"). */
  questionType?: string
  /** Original TOEIC grammar point label (Parts 5 & 6). */
  grammarPoint?: string
}

export type BankQuestion = {
  id: number | string
  question: string
  options?: Record<string, string>
  answer: string
  explainAnswer?: string
  explanation?: string
  explain_answer?: string
  explanation_text?: string
  reason?: string
  transcript?: string
  audioTimestamp?: string
  chapter?: string
  image?: string
}

export type BankFile = {
  title?: string
  questions?: BankQuestion[]
  parts?: BankPart[]
}

export type BankPart = {
  partNumber: number
  partTitle: string
  instruction?: string
  passage?: string
  referenceNotices?: Record<string, string>
  audioUrl?: string
  imageUrl?: string
  section?: "Listening" | "Reading"
  questions: BankQuestion[]
}

export type AnswerValue = number | string
