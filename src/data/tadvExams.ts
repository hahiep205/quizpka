import type { LocalizedText } from "@/data/subjects"

export type TadvAudioTrack = {
  label: LocalizedText
  url: string
  fileName: string
}

export type TadvExamOption = {
  id: string
  title: LocalizedText
  description: LocalizedText
  questionBanks: string[]
  questionCount?: number
  /** Listening audio files offered as extra downloads in the download flow. */
  audioTracks?: TadvAudioTrack[]
}

export const tadvExamOptions: TadvExamOption[] = [
  {
    id: "english-placement-reference-4",
    title: { en: "English Placement Test - Reference 4", vi: "Tiếng Anh Đầu Vào - Bộ đề mẫu mới nhất được cập nhật ngày 09/09/26." },
    description: { en: "50 questions across Listening and Reading, organized by part with shared audio and passages.", vi: "50 câu hỏi Nghe và Đọc, được phân theo Part với audio và nội dung chung." },
    questionBanks: ["/data/tadv/test01/test01.json"],
    questionCount: 50,
    audioTracks: [
      {
        label: { en: "Part 1: Listening - Short Announcements or Instructions", vi: "Part 1: Listening - Short Announcements or Instructions" },
        url: "/data/tadv/test01/part1-audio.mp3",
        fileName: "TADV-Part1-Listening.mp3",
      },
      {
        label: { en: "Part 2: Listening - Conversation about a Computer Game", vi: "Part 2: Listening - Conversation about a Computer Game" },
        url: "/data/tadv/test01/part2-audio.mp3",
        fileName: "TADV-Part2-Listening.mp3",
      },
    ],
  },
]
