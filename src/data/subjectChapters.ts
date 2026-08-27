import { subjects, type ChapterOption, type SubjectId } from "@/data/subjects"
import { filterHcmQuestionsByChapter, isHcmChapterId } from "@/data/hcmChapters"

export type { ChapterOption }
export type ChapterId = string

type ChapterQuestion = { id: number | string; chapter?: string }
type ChapterFilter = <T extends ChapterQuestion>(questions: T[], chapterId: ChapterId) => T[]
type ChapterSubjectId = Exclude<SubjectId, "tieng-anh-dau-vao" | "bao-mat-ung-dung-he-thong" | "toeic">

export const subjectChapterMap: Partial<Record<SubjectId, ChapterOption[]>> = Object.fromEntries(
  subjects.flatMap((subject) => subject.chapters?.length ? [[subject.id, subject.chapters] as const] : [])
)

function numericId(id: number | string): number | null {
  const parsed = typeof id === "number" ? id : Number.parseInt(id, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function filterByRange<T extends ChapterQuestion>(questions: T[], chapterId: string, ranges: Record<string, readonly [number, number]>): T[] {
  const range = ranges[chapterId]
  if (!range) return questions
  return questions.filter((question) => {
    const id = numericId(question.id)
    return id !== null && id >= range[0] && id <= range[1]
  })
}

function filterByChapterNames<T extends ChapterQuestion>(questions: T[], chapterId: string, groups: Record<string, readonly string[]>): T[] {
  const names = groups[chapterId]
  return names ? questions.filter((question) => names.includes(question.chapter ?? "")) : questions
}

const cnxhFilter: ChapterFilter = (questions, chapterId) => filterByRange(questions, chapterId, {
  c1: [1, 28], c2: [29, 56], c3: [57, 84], c4: [85, 112], c5: [113, 140], c6: [141, 168], c7: [169, 195], c1234_mid: [1, 112], c567_final: [113, 195],
})

const knldFilter: ChapterFilter = (questions, chapterId) => filterByChapterNames(questions, chapterId, {
  c1: ["Chương 1"], c2: ["Chương 2"], c3: ["Chương 3"], c4: ["Chương 4"], c5: ["Chương 5"], c123_mid: ["Chương 1", "Chương 2", "Chương 3"], c45_final: ["Chương 4", "Chương 5"],
})

const pmFilter: ChapterFilter = (questions, chapterId) => filterByChapterNames(questions, chapterId, {
  c1: ["Chương 1"], c2: ["Chương 2"], c3: ["Chương 3"], c4: ["Chương 4"], c5: ["Chương 5"], c6: ["Chương 6"], c7: ["Chương 7"], c8: ["Chương 8"], c12345_mid: ["Chương 1", "Chương 2", "Chương 3", "Chương 4", "Chương 5"], c678_final: ["Chương 6", "Chương 7", "Chương 8"],
})

const lsdFilter: ChapterFilter = (questions, chapterId) => filterByChapterNames(questions, chapterId, {
  suutam: ["Câu Hỏi Trên Canvas", "Chương Mất Gốc", "Chương Nhập Môn"], c1: ["Chương 1", "Chương 1 donate"], c2: ["Chương 2", "Chương 2 donate"], c3: ["Chương 3", "Chương 3 Donate"], c12_mid: ["Chương 1", "Chương 1 donate", "Chương 2", "Chương 2 donate"], c3_final: ["Chương 3", "Chương 3 Donate"],
})

const qthFilter: ChapterFilter = (questions, chapterId) => filterByChapterNames(questions, chapterId, {
  c1: ["Chương 1"], c2: ["Chương 2"], c3: ["Chương 3"], c4: ["Chương 4"], c5: ["Chương 5"], c6: ["Chương 6"], c7: ["Chương 7"], c1234_mid: ["Chương 1", "Chương 2", "Chương 3", "Chương 4", "Chương 1,2,3 MIX"], c567_final: ["Chương 5", "Chương 6", "Chương 7", "Chương 4&5 MIX", "Chương 6&7 MIX"],
})

const mln2tcFilter: ChapterFilter = (questions, chapterId) => filterByChapterNames(questions, chapterId, {
  c12_mid: ["Câu Hỏi Trong Slide Bài Giảng", "Chương 1 nè", "Chương 2 nè", "Chương 1,2 câu 0,35-0.4 điểm"], c3_final: ["Chương 3 câu 0,35 điểm", "Chương 1,2,3 câu 0,3 điểm"],
})

const mln3tcFilter: ChapterFilter = (questions, chapterId) => filterByChapterNames(questions, chapterId, {
  c12_mid: ["Chương 1", "Chương 2"], c3_final: ["Chương 3 cuối kì"],
})

const chapterFilters: Partial<Record<ChapterSubjectId, ChapterFilter>> = {
  "tu-tuong-ho-chi-minh": (questions, chapterId) => isHcmChapterId(chapterId) ? filterHcmQuestionsByChapter(questions, chapterId) : questions,
  "chu-nghia-xa-hoi-khoa-hoc": cnxhFilter,
  "ky-nang-khoi-nghiep-va-lanh-dao": knldFilter,
  "ky-nang-quan-ly-du-an": pmFilter,
  "lich-su-dang-cong-san-viet-nam": lsdFilter,
  "quan-tri-hoc": qthFilter,
  "triet-hoc-mac-lenin-2tc": mln2tcFilter,
  "triet-hoc-mac-lenin-3tc": mln3tcFilter,
}

export function getChapterOptionsForSubject(subjectId: string): ChapterOption[] | null {
  return subjectChapterMap[subjectId as SubjectId] ?? null
}

export function hasChapterSupport(subjectId: string): boolean {
  return subjectId in chapterFilters
}

export function filterQuestionsBySubjectChapter<T extends ChapterQuestion>(subjectId: string, questions: T[], chapterId: ChapterId): T[] {
  if (chapterId === "all") return questions
  return chapterFilters[subjectId as ChapterSubjectId]?.(questions, chapterId) ?? questions
}
