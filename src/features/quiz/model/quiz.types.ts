export type Question = {
  id: string
  prompt: string
  options: string[]
  correctIndex?: number
  acceptedAnswers?: string[]
  explanation?: string
  partTitle?: string
  section?: "Listening" | "Reading"
  instruction?: string
  passage?: string
  referenceNotices?: Record<string, string>
  audioUrl?: string
  audioTimestamp?: string
  imageUrl?: string
}

export type BankQuestion = {
  id: number | string
  question: string
  options?: Record<string, string>
  answer: string
  explainAnswer?: string
  transcript?: string
  audioTimestamp?: string
  chapter?: string
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
