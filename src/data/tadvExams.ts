import type { LocalizedText } from "@/data/subjects"

export type TadvExamOption = {
  id: string
  title: LocalizedText
  description: LocalizedText
  questionBanks: string[]
  questionCount?: number
}

export const tadvExamOptions: TadvExamOption[] = [
  {
    id: "english-placement-reference-4",
    title: { en: "English Placement Test - Reference 4", vi: "Tiếng Anh Đầu Vào - Bộ đề mẫu mới nhất được cập nhật ngày 09/09/26." },
    description: { en: "50 questions across Listening and Reading, organized by part with shared audio and passages.", vi: "50 câu hỏi Nghe và Đọc, được phân theo Part với audio và nội dung chung." },
    questionBanks: ["/data/tadv/test01/test01.json"],
    questionCount: 50,
  },
]
