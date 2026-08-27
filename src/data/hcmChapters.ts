export type HcmChapterId = "all" | "suutam" | "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c123_mid" | "c456_final"

const hcmChapterIds = new Set<HcmChapterId>(["all", "suutam", "c1", "c2", "c3", "c4", "c5", "c6", "c123_mid", "c456_final"])

export function isHcmChapterId(value: string): value is HcmChapterId {
  return hcmChapterIds.has(value as HcmChapterId)
}

export function filterHcmQuestionsByChapter<T extends { chapter?: string; id: number | string }>(
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
