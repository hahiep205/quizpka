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
    description: { en: "A question bank of 95 questions.", vi: "Bộ tài liệu gồm 95 câu hỏi." },
    questionCount: 95,
    durationMinutes: 120,
  },
  {
    id: "data-science-ai-final-1",
    title: { en: "Data Science & AI - Final", vi: "Khoa học dữ liệu và Trí tuệ nhân tạo - Cuối kỳ" },
    description: { en: "A question bank of 203 questions, covering both midterm and final content.", vi: "Bộ tài liệu gồm 203 câu hỏi, bao gồm cả nội dung Giữa và Cuối kỳ." },
    questionCount: 203,
    durationMinutes: 240,
  },
]
