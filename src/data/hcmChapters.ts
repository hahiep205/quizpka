export type HcmChapterId = "all" | "suutam" | "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c123_mid" | "c456_final"

export type HcmChapterOption = {
  id: HcmChapterId
  label: { en: string; vi: string }
  description: { en: string; vi: string }
  count: number
  test: (chapter: string) => boolean
}

export const hcmChapterOptions: HcmChapterOption[] = [
  {
    id: "all",
    label: { en: "All chapters", vi: "Toàn bộ (680 câu)" },
    description: { en: "All 680 questions", vi: "Tất cả 680 câu hỏi" },
    count: 680,
    test: () => true,
  },
  {
    id: "c123_mid",
    label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" },
    description: { en: "294 questions", vi: "294 câu" },
    count: 294,
    test: (chapter) => chapter.includes("C1, 2") || chapter.includes("Chương 1&2"),
  },
  {
    id: "c456_final",
    label: { en: "Chapters 4,5,6 - Final", vi: "Chương 4,5,6 - Cuối kỳ" },
    description: { en: "347 questions", vi: "347 câu" },
    count: 347,
    test: (chapter) => chapter.includes("C5, 6") || chapter.includes("Chương 5&6"),
  },
  {
    id: "suutam",
    label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" },
    description: { en: "39 questions", vi: "39 câu" },
    count: 39,
    test: (chapter) => chapter === "Câu Hỏi Trong SLIDE",
  },
  {
    id: "c1",
    label: { en: "Chapter 1", vi: "Chương 1" },
    description: { en: "89 questions", vi: "89 câu" },
    count: 89,
    test: (chapter) => chapter.includes("Chương 1&2") || chapter.includes("C1, 2"),
  },
  {
    id: "c2",
    label: { en: "Chapter 2", vi: "Chương 2" },
    description: { en: "89 questions", vi: "89 câu" },
    count: 89,
    test: (chapter) => chapter.includes("Chương 1&2") || chapter.includes("C1, 2"),
  },
  {
    id: "c3",
    label: { en: "Chapter 3", vi: "Chương 3" },
    description: { en: "115 questions", vi: "115 câu" },
    count: 115,
    test: (chapter) => chapter.includes("Chương 3&4") || chapter.includes("C3, 4"),
  },
  {
    id: "c4",
    label: { en: "Chapter 4", vi: "Chương 4" },
    description: { en: "116 questions", vi: "116 câu" },
    count: 116,
    test: (chapter) => chapter.includes("Chương 3&4") || chapter.includes("C3, 4"),
  },
  {
    id: "c5",
    label: { en: "Chapter 5", vi: "Chương 5" },
    description: { en: "116 questions", vi: "116 câu" },
    count: 116,
    test: (chapter) => chapter.includes("Chương 5&6") || chapter.includes("C5, 6"),
  },
  {
    id: "c6",
    label: { en: "Chapter 6", vi: "Chương 6" },
    description: { en: "116 questions", vi: "116 câu" },
    count: 116,
    test: (chapter) => chapter.includes("Chương 5&6") || chapter.includes("C5, 6"),
  },
]

export function filterHcmQuestionsByChapter<T extends { chapter?: string; id?: number | string }>(
  questions: T[],
  chapterId: HcmChapterId
): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "suutam") return questions.filter((q) => q.chapter === "Câu Hỏi Trong SLIDE")
  if (chapterId === "c1")
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (!(ch.includes("C1, 2") || ch.includes("Chương 1&2"))) return false
      const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
      return id !== undefined ? id % 2 === 0 : true
    })
  if (chapterId === "c2")
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (!(ch.includes("C1, 2") || ch.includes("Chương 1&2"))) return false
      const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
      return id !== undefined ? id % 2 === 1 : false
    })
  if (chapterId === "c3")
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (!(ch.includes("C3, 4") || ch.includes("Chương 3&4"))) return false
      const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
      return id !== undefined ? id % 2 === 0 : true
    })
  if (chapterId === "c4")
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (!(ch.includes("C3, 4") || ch.includes("Chương 3&4"))) return false
      const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
      return id !== undefined ? id % 2 === 1 : false
    })
  if (chapterId === "c5")
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (!(ch.includes("C5, 6") || ch.includes("Chương 5&6"))) return false
      const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
      return id !== undefined ? id % 2 === 0 : true
    })
  if (chapterId === "c6")
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (!(ch.includes("C5, 6") || ch.includes("Chương 5&6"))) return false
      const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
      return id !== undefined ? id % 2 === 1 : false
    })
  if (chapterId === "c123_mid") {
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (ch.includes("C1, 2") || ch.includes("Chương 1&2")) return true
      if (ch.includes("C3, 4") || ch.includes("Chương 3&4")) {
        const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
        return id !== undefined ? id % 2 === 0 : true
      }
      return false
    })
  }
  if (chapterId === "c456_final") {
    return questions.filter((q) => {
      const ch = q.chapter ?? ""
      if (ch.includes("C5, 6") || ch.includes("Chương 5&6")) return true
      if (ch.includes("C3, 4") || ch.includes("Chương 3&4")) {
        const id = typeof q.id === "string" ? parseInt(q.id as string, 10) : (q.id as number | undefined)
        return id !== undefined ? id % 2 === 1 : false
      }
      return false
    })
  }
  return questions
}

export function getHcmChapterLabel(chapterId: HcmChapterId, lang: "en" | "vi") {
  return hcmChapterOptions.find((o) => o.id === chapterId)?.label[lang] ?? chapterId
}
