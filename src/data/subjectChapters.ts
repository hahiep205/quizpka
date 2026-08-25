import { subjects } from "@/data/subjects"
import type { ChapterOption } from "@/data/subjects"
import { hcmChapterOptions, filterHcmQuestionsByChapter, type HcmChapterId } from "@/data/hcmChapters"

export type { ChapterOption }

export type ChapterId = HcmChapterId | string

// Build map from subjects.chapters (source of truth)
export const subjectChapterMap: Record<string, ChapterOption[]> = Object.fromEntries(
  subjects.filter((s) => s.chapters && s.chapters.length > 0).map((s) => [s.id, s.chapters!])
)

// Re-export hcm options for direct use (kept for compatibility)
export { hcmChapterOptions }

// Filter helpers (kept for question filtering logic)
function filterCnxhQuestionsByChapter<T extends { id: number | string }>(
  questions: T[],
  chapterId: string
): T[] {
  if (chapterId === "all") return questions
  const getRange = (id: string): [number, number] | null => {
    if (id === "c1") return [1, 28]
    if (id === "c2") return [29, 56]
    if (id === "c3") return [57, 84]
    if (id === "c4") return [85, 112]
    if (id === "c5") return [113, 140]
    if (id === "c6") return [141, 168]
    if (id === "c7") return [169, 195]
    if (id === "c1234_mid") return [1, 112]
    if (id === "c567_final") return [113, 195]
    return null
  }
  const range = getRange(chapterId)
  if (!range) return questions
  const [start, end] = range
  return questions.filter((q) => {
    const nid = typeof q.id === "string" ? parseInt(q.id, 10) : q.id
    return nid >= start && nid <= end
  })
}

function filterKnldQuestionsByChapter<T extends { chapter?: string }>(questions: T[], chapterId: string): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "c1") return questions.filter((q) => q.chapter === "Chương 1")
  if (chapterId === "c2") return questions.filter((q) => q.chapter === "Chương 2")
  if (chapterId === "c3") return questions.filter((q) => q.chapter === "Chương 3")
  if (chapterId === "c4") return questions.filter((q) => q.chapter === "Chương 4")
  if (chapterId === "c5") return questions.filter((q) => q.chapter === "Chương 5")
  if (chapterId === "c123_mid") return questions.filter((q) => q.chapter === "Chương 1" || q.chapter === "Chương 2" || q.chapter === "Chương 3")
  if (chapterId === "c45_final") return questions.filter((q) => q.chapter === "Chương 4" || q.chapter === "Chương 5")
  return questions
}

function filterPmQuestionsByChapter<T extends { chapter?: string }>(questions: T[], chapterId: string): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "c1") return questions.filter((q) => q.chapter === "Chương 1")
  if (chapterId === "c2") return questions.filter((q) => q.chapter === "Chương 2")
  if (chapterId === "c3") return questions.filter((q) => q.chapter === "Chương 3")
  if (chapterId === "c4") return questions.filter((q) => q.chapter === "Chương 4")
  if (chapterId === "c5") return questions.filter((q) => q.chapter === "Chương 5")
  if (chapterId === "c6") return questions.filter((q) => q.chapter === "Chương 6")
  if (chapterId === "c7") return questions.filter((q) => q.chapter === "Chương 7")
  if (chapterId === "c8") return questions.filter((q) => q.chapter === "Chương 8")
  if (chapterId === "c12345_mid") return questions.filter((q) => ["Chương 1", "Chương 2", "Chương 3", "Chương 4", "Chương 5"].includes(q.chapter ?? ""))
  if (chapterId === "c678_final") return questions.filter((q) => ["Chương 6", "Chương 7", "Chương 8"].includes(q.chapter ?? ""))
  return questions
}

function filterLsdQuestionsByChapter<T extends { chapter?: string }>(questions: T[], chapterId: string): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "suutam") return questions.filter((q) => ["Câu Hỏi Trên Canvas", "Chương Mất Gốc", "Chương Nhập Môn"].includes(q.chapter ?? ""))
  if (chapterId === "c1") return questions.filter((q) => ["Chương 1", "Chương 1 donate"].includes(q.chapter ?? ""))
  if (chapterId === "c2") return questions.filter((q) => ["Chương 2", "Chương 2 donate"].includes(q.chapter ?? ""))
  if (chapterId === "c3") return questions.filter((q) => ["Chương 3", "Chương 3 Donate"].includes(q.chapter ?? ""))
  if (chapterId === "c12_mid") return questions.filter((q) => ["Chương 1", "Chương 1 donate", "Chương 2", "Chương 2 donate"].includes(q.chapter ?? ""))
  if (chapterId === "c3_final") return questions.filter((q) => ["Chương 3", "Chương 3 Donate"].includes(q.chapter ?? ""))
  return questions
}

function filterQthQuestionsByChapter<T extends { chapter?: string }>(questions: T[], chapterId: string): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "c1") return questions.filter((q) => q.chapter === "Chương 1")
  if (chapterId === "c2") return questions.filter((q) => q.chapter === "Chương 2")
  if (chapterId === "c3") return questions.filter((q) => q.chapter === "Chương 3")
  if (chapterId === "c4") return questions.filter((q) => q.chapter === "Chương 4")
  if (chapterId === "c5") return questions.filter((q) => q.chapter === "Chương 5")
  if (chapterId === "c6") return questions.filter((q) => q.chapter === "Chương 6")
  if (chapterId === "c7") return questions.filter((q) => q.chapter === "Chương 7")
  if (chapterId === "c1234_mid") return questions.filter((q) => ["Chương 1", "Chương 2", "Chương 3", "Chương 4", "Chương 1,2,3 MIX"].includes(q.chapter ?? ""))
  if (chapterId === "c567_final") return questions.filter((q) => ["Chương 5", "Chương 6", "Chương 7", "Chương 4&5 MIX", "Chương 6&7 MIX"].includes(q.chapter ?? ""))
  return questions
}

function filterMln2tcQuestionsByChapter<T extends { chapter?: string }>(questions: T[], chapterId: string): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "c12_mid") return questions.filter((q) => ["Câu Hỏi Trong Slide Bài Giảng", "Chương 1 nè", "Chương 2 nè", "Chương 1,2 câu 0,35-0.4 điểm"].includes(q.chapter ?? ""))
  if (chapterId === "c3_final") return questions.filter((q) => ["Chương 3 câu 0,35 điểm", "Chương 1,2,3 câu 0,3 điểm"].includes(q.chapter ?? ""))
  return questions
}

function filterMln3tcQuestionsByChapter<T extends { chapter?: string }>(questions: T[], chapterId: string): T[] {
  if (chapterId === "all") return questions
  if (chapterId === "c12_mid") return questions.filter((q) => q.chapter === "Chương 1" || q.chapter === "Chương 2")
  if (chapterId === "c3_final") return questions.filter((q) => q.chapter === "Chương 3 cuối kì")
  return questions
}

export function getChapterOptionsForSubject(subjectId: string): ChapterOption[] | null {
  return subjectChapterMap[subjectId] ?? null
}

export function hasChapterSupport(subjectId: string): boolean {
  return subjectId in subjectChapterMap
}

export function filterQuestionsBySubjectChapter<T extends { chapter?: string; id: number | string }>(
  subjectId: string,
  questions: T[],
  chapterId: string
): T[] {
  if (chapterId === "all") return questions
  if (subjectId === "tu-tuong-ho-chi-minh") {
    return filterHcmQuestionsByChapter(questions as any, chapterId as HcmChapterId) as T[]
  }
  if (subjectId === "chu-nghia-xa-hoi-khoa-hoc") return filterCnxhQuestionsByChapter(questions, chapterId)
  if (subjectId === "ky-nang-khoi-nghiep-va-lanh-dao") return filterKnldQuestionsByChapter(questions, chapterId)
  if (subjectId === "ky-nang-quan-ly-du-an") return filterPmQuestionsByChapter(questions, chapterId)
  if (subjectId === "lich-su-dang-cong-san-viet-nam") return filterLsdQuestionsByChapter(questions, chapterId)
  if (subjectId === "quan-tri-hoc") return filterQthQuestionsByChapter(questions, chapterId)
  if (subjectId === "triet-hoc-mac-lenin-2tc") return filterMln2tcQuestionsByChapter(questions, chapterId)
  if (subjectId === "triet-hoc-mac-lenin-3tc") return filterMln3tcQuestionsByChapter(questions, chapterId)
  return questions
}
