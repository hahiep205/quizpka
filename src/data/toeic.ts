import type { LocalizedText } from "@/data/subjects"

export const TOEIC_TEST_ID = "toeic-test-01"
export const TOEIC_TEST_IDS = ["toeic-test-01", "toeic-test-02", "toeic-test-03"] as const
export type ToeicTestId = (typeof TOEIC_TEST_IDS)[number]

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

function createPartFiles(testNumber: string) {
  const base = `/data/toeic-test/Test-${testNumber}`
  return {
    part1: `${base}/Part1/test${testNumber.replace("-", "")}-part1.json`,
    part2: `${base}/Part2/part2.json`,
    part3: `${base}/Part3/part3.json`,
    part4: `${base}/Part4/part4.json`,
    part5: `${base}/Part5/part5.json`,
    part6: `${base}/Part6/part6.json`,
    part7: `${base}/Part7/part7.json`,
  } as const
}

const PART_FILES_BY_TEST: Record<ToeicTestId, ReturnType<typeof createPartFiles>> = {
  "toeic-test-01": createPartFiles("01"),
  "toeic-test-02": createPartFiles("02"),
  "toeic-test-03": createPartFiles("03"),
}

export function getToeicScopeOptions(examId: string = TOEIC_TEST_ID): ToeicScopeOption[] {
  const files = PART_FILES_BY_TEST[examId as ToeicTestId] ?? PART_FILES_BY_TEST[TOEIC_TEST_ID]
  return [
    {
    id: "full",
    label: { en: "Full Test (200 questions)", vi: "Full Test (200 câu)" },
    description: {
      en: "All 7 parts - complete TOEIC simulation",
      vi: "Toàn bộ 7 Part - mô phỏng đề TOEIC hoàn chỉnh",
    },
    count: 200,
    durationMinutes: 120,
    files: Object.values(files),
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
    files: [files.part1, files.part2, files.part3, files.part4],
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
    files: [files.part5, files.part6, files.part7],
    groupLabel: { en: "By Skill", vi: "Theo kỹ năng" },
  },
  {
    id: "part1",
    label: { en: "Part 1 - Photographs", vi: "Part 1 - Mô tả tranh" },
    description: { en: "Listening - Part 1", vi: "Listening - Part 1" },
    count: 6,
    durationMinutes: 5,
    files: [files.part1],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part2",
    label: { en: "Part 2 - Q&A", vi: "Part 2 - Hỏi & Đáp" },
    description: { en: "Listening - Part 2", vi: "Listening - Part 2" },
    count: 25,
    durationMinutes: 15,
    files: [files.part2],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part3",
    label: { en: "Part 3 - Conversations", vi: "Part 3 - Hội thoại" },
    description: { en: "Listening - Part 3", vi: "Listening - Part 3" },
    count: 39,
    durationMinutes: 25,
    files: [files.part3],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part4",
    label: { en: "Part 4 - Talks", vi: "Part 4 - Bài nói" },
    description: { en: "Listening - Part 4", vi: "Listening - Part 4" },
    count: 30,
    durationMinutes: 20,
    files: [files.part4],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part5",
    label: { en: "Part 5 - Incomplete Sentences", vi: "Part 5 - Câu chưa hoàn chỉnh" },
    description: { en: "Reading - Part 5", vi: "Reading - Part 5" },
    count: 30,
    durationMinutes: 15,
    files: [files.part5],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part6",
    label: { en: "Part 6 - Text Completion", vi: "Part 6 - Hoàn thiện đoạn văn" },
    description: { en: "Reading - Part 6", vi: "Reading - Part 6" },
    count: 16,
    durationMinutes: 10,
    files: [files.part6],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  {
    id: "part7",
    label: { en: "Part 7 - Reading Comprehension", vi: "Part 7 - Đọc hiểu" },
    description: { en: "Reading - Part 7", vi: "Reading - Part 7" },
    count: 54,
    durationMinutes: 55,
    files: [files.part7],
    groupLabel: { en: "By Part", vi: "Theo Part" },
  },
  ]
}

export function getToeicScopeOption(id: string, examId: string = TOEIC_TEST_ID): ToeicScopeOption | null {
  return getToeicScopeOptions(examId).find((o) => o.id === id) ?? null
}
