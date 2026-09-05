import type { LocalizedText } from "@/data/subjects"

export type DsaiExamOption = {
  id: string
  title: LocalizedText
  description: LocalizedText
  questionCount: number
  durationMinutes: number
}

export const dsaiExamOptions: DsaiExamOption[] = [
  {
    id: "data-science-ai-midterm-1",
    title: { en: "Data Science & AI - Midterm", vi: "Khoa học dữ liệu và Trí tuệ nhân tạo - Giữa kỳ" },
    description: { en: "95 midterm review questions.", vi: "95 câu hỏi ôn tập giữa kỳ." },
    questionCount: 95,
    durationMinutes: 60,
  },
  {
    id: "data-science-ai-final-1",
    title: { en: "Data Science & AI - Final", vi: "Khoa học dữ liệu và Trí tuệ nhân tạo - Cuối kỳ" },
    description: { en: "203 final review questions.", vi: "203 câu hỏi ôn tập cuối kỳ." },
    questionCount: 203,
    durationMinutes: 60,
  },
]
