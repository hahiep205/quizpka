import type { LocalizedText } from "@/data/subjects"

export const TOEIC_TEST_ID = "toeic-test-01"
export const TOEIC_SUBJECT_ID = "toeic"
export const TOEIC_SUBJECT_CODE = "TOEIC01"

export type ToeicScope =
  | "full"
  | "listening"
  | "reading"
  | "part1"
  | "part2"
  | "part3"
  | "part4"
  | "part5"
  | "part6"
  | "part7"

export type ToeicScopeOption = {
  id: ToeicScope
  label: LocalizedText
  description: LocalizedText
  count: number
  durationMinutes: number
  files: string[]
  groupLabel: LocalizedText
}

const BASE = "/data/toeic-test/Test-01"

const PART_FILES = {
  part1: `${BASE}/Part1/test01-part1.json`,
  part2: `${BASE}/Part2/part2.json`,
  part3: `${BASE}/Part3/part3.json`,
  part4: `${BASE}/Part4/part4.json`,
  part5: `${BASE}/Part5/part5.json`,
  part6: `${BASE}/Part6/part6.json`,
  part7: `${BASE}/Part7/part7.json`,
} as const

export const toeicScopeOptions: ToeicScopeOption[] = [
  {
    id: "full",
    label: { en: "Full Test (200 questions)", vi: "Full Test (200 câu)" },
    description: {
      en: "All 7 parts - complete TOEIC simulation",
      vi: "Toàn bộ 7 Part - mô phỏng đề TOEIC hoàn chỉnh",
    },
    count: 200,
    durationMinutes: 120,
    files: Object.values(PART_FILES),
    groupLabel: { en: "Full", vi: "Toàn bộ" },
  },
  {
    id: "listening",
    label: { en: "Listening Test (100 questions)", vi: "Listening Test (100 câu)" },
    description: {
      en: "Part 1, 2, 3, 4 - Listening section",
      vi: "Part 1, 2, 3, 4 - Phần Listening",
    },
    count: 100,
    durationMinutes: 60,
    files: [PART_FILES.part1, PART_FILES.part2, PART_FILES.part3, PART_FILES.part4],
    groupLabel: { en: "By Skill", vi: "Theo kỹ năng" },
  },
  {
    id: "reading",
    label: { en: "Reading Test (100 questions)", vi: "Reading Test (100 câu)" },
    description: {
      en: "Part 5, 6, 7 - Reading section",
      vi: "Part 5, 6, 7 - Phần Reading",
    },
    count: 100,
    durationMinutes: 75,
    files: [PART_FILES.part5, PART_FILES.part6, PART_FILES.part7],
    groupLabel: { en: "By Skill", vi: "Theo kỹ năng" },
  },
  {
    id: "part1",
    label: { en: "Part 1 - Photographs (6 questions)", vi: "Part 1 - Mô tả tranh (6 câu)" },
    description: { en: "Listening - Part 1", vi: "Listening - Part 1" },
    count: 6,
    durationMinutes: 5,
    files: [PART_FILES.part1],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part2",
    label: { en: "Part 2 - Q&A (25 questions)", vi: "Part 2 - Hỏi & Đáp (25 câu)" },
    description: { en: "Listening - Part 2", vi: "Listening - Part 2" },
    count: 25,
    durationMinutes: 15,
    files: [PART_FILES.part2],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part3",
    label: { en: "Part 3 - Conversations (39 questions)", vi: "Part 3 - Hội thoại (39 câu)" },
    description: { en: "Listening - Part 3", vi: "Listening - Part 3" },
    count: 39,
    durationMinutes: 25,
    files: [PART_FILES.part3],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part4",
    label: { en: "Part 4 - Talks (30 questions)", vi: "Part 4 - Bài nói (30 câu)" },
    description: { en: "Listening - Part 4", vi: "Listening - Part 4" },
    count: 30,
    durationMinutes: 20,
    files: [PART_FILES.part4],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part5",
    label: { en: "Part 5 - Incomplete Sentences (30 questions)", vi: "Part 5 - Câu chưa hoàn chỉnh (30 câu)" },
    description: { en: "Reading - Part 5", vi: "Reading - Part 5" },
    count: 30,
    durationMinutes: 15,
    files: [PART_FILES.part5],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part6",
    label: { en: "Part 6 - Text Completion (16 questions)", vi: "Part 6 - Hoàn thiện đoạn văn (16 câu)" },
    description: { en: "Reading - Part 6", vi: "Reading - Part 6" },
    count: 16,
    durationMinutes: 10,
    files: [PART_FILES.part6],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part7",
    label: { en: "Part 7 - Reading Comprehension (54 questions)", vi: "Part 7 - Đọc hiểu (54 câu)" },
    description: { en: "Reading - Part 7", vi: "Reading - Part 7" },
    count: 54,
    durationMinutes: 55,
    files: [PART_FILES.part7],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
]

export const toeicPartFiles = PART_FILES

export function getToeicScopeOption(id: string): ToeicScopeOption | null {
  return toeicScopeOptions.find((o) => o.id === id) ?? null
}

export function getToeicFilesForScope(scope: ToeicScope): string[] {
  const opt = getToeicScopeOption(scope)
  return opt ? opt.files : []
}

export function isToeicScope(value: string): value is ToeicScope {
  return toeicScopeOptions.some((o) => o.id === value)
}

export const toeicTestMeta = {
  id: TOEIC_TEST_ID,
  subjectId: TOEIC_SUBJECT_ID,
  subjectCode: TOEIC_SUBJECT_CODE,
  year: 2026,
  title: {
    en: "TOEIC Practice Set 01",
    vi: "Bộ tài liệu ôn luyện TOEIC 01",
  } as LocalizedText,
  description: {
    en: "Full ETS 2024 format with 200 questions across Listening and Reading. Choose Full Test, skill-based or per-Part practice.",
    vi: "Chuẩn ETS 2024 với 200 câu Listening & Reading. Chọn Full Test, luyện theo kỹ năng hoặc theo từng Part.",
  } as LocalizedText,
  questionCount: 200,
  durationMinutes: 120,
}
