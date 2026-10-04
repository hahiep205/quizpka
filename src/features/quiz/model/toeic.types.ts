type ToeicOptionKey = "A" | "B" | "C" | "D" | "E" | "F"

type RawToeicAnalysisEntry = { reason?: string }
type RawToeicVocabulary = { phrase: string; meaning: string; paraphrases?: string[] }

export type RawToeicQuestion = {
  id?: string | number
  type?: string
  question?: string
  prompt?: string
  options?: Partial<Record<ToeicOptionKey, string>>
  answer?: string
  correct_answer?: string
  explainAnswer?: string
  correct_text?: string
  analysis?: Partial<Record<ToeicOptionKey, RawToeicAnalysisEntry>>
  vocabulary?: RawToeicVocabulary[]
  grammar_point?: string
  strategy?: string[]
  audio_transcript?: string
  image_description?: string
}

type RawToeicPart1Question = RawToeicQuestion & { audio?: string; image?: string }
type RawToeicPart2Question = RawToeicQuestion & { audio?: string }
type RawToeicPart3Group = { group: string | number; audio?: string; image?: string; questions: RawToeicQuestion[] }
type RawToeicPart4Group = { group: string | number; audio?: string; image?: string; questions: RawToeicQuestion[] }
type RawToeicPart5Question = RawToeicQuestion
type RawToeicPart6Group = { group_id?: string | number; passage?: string; questions: RawToeicQuestion[] }
type RawToeicPassage = { title?: string; documentId?: string | number; documentType?: string; content?: string; text?: string }
type RawToeicPart7Group = { groupId?: string | number; group_id?: string | number; passage?: string; passages?: RawToeicPassage[]; questions: RawToeicQuestion[] }

type RawToeicPart1 = RawToeicPart1Question[]
type RawToeicPart2 = RawToeicPart2Question[]
type RawToeicPart3 = RawToeicPart3Group[]
type RawToeicPart4 = RawToeicPart4Group[]
type RawToeicPart5 = RawToeicPart5Question[]
type RawToeicPart6 = RawToeicPart6Group[]
export type RawToeicPart7 = { groups: RawToeicPart7Group[] }

export type RawToeicBank =
  | { part: 1; data: RawToeicPart1 }
  | { part: 2; data: RawToeicPart2 }
  | { part: 3; data: RawToeicPart3 }
  | { part: 4; data: RawToeicPart4 }
  | { part: 5; data: RawToeicPart5 }
  | { part: 6; data: RawToeicPart6 }
  | { part: 7; data: RawToeicPart7 }
