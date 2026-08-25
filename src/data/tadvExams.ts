import type { LocalizedText } from "@/data/subjects"

export type TadvExamOption = {
  id: string
  title: LocalizedText
  description: LocalizedText
  questionBanks: string[]
}

export const tadvExamOptions: TadvExamOption[] = [
  {
    id: "english-placement-reference-1",
    title: { en: "English Placement Test - Reference 1", vi: "Tiếng Anh Đầu Vào - Đề tham khảo 1" },
    description: { en: "55 questions across Listening and Reading, organized by part with shared audio and passages.", vi: "55 câu hỏi Nghe và Đọc, được phân theo Part với audio và nội dung chung." },
    questionBanks: ["/data/tadv-reading.json", "/data/tadv-listening.json"],
  },
  {
    id: "english-placement-reference-2",
    title: { en: "English Placement Test - Reference 2", vi: "Tiếng Anh Đầu Vào - Đề tham khảo 2" },
    description: { en: "55 questions across Listening and Reading, organized by part with shared audio and passages.", vi: "55 câu hỏi Nghe và Đọc, được phân theo Part với audio và nội dung chung." },
    questionBanks: ["/data/tadv2-reading.json", "/data/tadv2-listening.json"],
  },
  {
    id: "english-placement-reference-3",
    title: { en: "English Placement Test - Reference 3", vi: "Tiếng Anh Đầu Vào - Đề tham khảo 3" },
    description: { en: "55 questions across Listening and Reading, organized by part with shared audio and passages.", vi: "55 câu hỏi Nghe và Đọc, được phân theo Part với audio và nội dung chung." },
    questionBanks: ["/data/tadv3-reading.json", "/data/tadv3-listening.json"],
  },
]
