import { subjects, type ChapterOption, type SubjectId } from "@/data/subjects"

export type { ChapterOption }
export type ChapterId = string

type ChapterQuestion = { id: number | string; chapter?: string }
type ChapterFilter = <T extends ChapterQuestion>(questions: T[], chapterId: ChapterId) => T[]

export const subjectChapterMap: Partial<Record<SubjectId, ChapterOption[]>> = Object.fromEntries(
  subjects.flatMap((subject) => (subject.chapters?.length ? [[subject.id, subject.chapters] as const] : []))
)

/**
 * Chapter labels each chapter group accepts, per subject. Groups are derived
 * from `subjects[].chapters` so the filter logic and the picker can never
 * drift apart: each option's `matches` list (or its Vietnamese label by
 * default) is prefix-matched with a boundary, so both short ("Chương 1") and
 * long ("Chương 1: Nhập môn …") source labels resolve to the same group.
 */
const chapterGroups: Record<string, Record<string, readonly string[]>> = Object.fromEntries(
  subjects.flatMap((subject) => {
    const groups = subject.chapters
      ?.filter((chapter) => chapter.id !== "all")
      .map((chapter) => [chapter.id, chapter.matches ?? [chapter.label.vi]] as const)
    if (!groups?.length) return []
    return [[subject.id, Object.fromEntries(groups)] as const]
  })
)

function matchesChapterLabel(label: string | undefined, prefix: string): boolean {
  if (!label) return false
  return label === prefix || label.startsWith(`${prefix}:`) || label.startsWith(`${prefix} `)
}

/**
 * Keep a question only when its chapter label matches a group label. Prefix
 * boundaries mean "Chương 1" also matches "Chương 1: …" and "Chương 1 donate",
 * but never "Chương 10".
 */
function filterByChapterGroups<T extends ChapterQuestion>(
  questions: T[],
  chapterId: string,
  groups: Readonly<Record<string, readonly string[]>>
): T[] {
  const labels = groups[chapterId]
  return labels ? questions.filter((question) => labels.some((label) => matchesChapterLabel(question.chapter, label))) : questions
}

function makeChapterFilter(groups: Readonly<Record<string, readonly string[]>>): ChapterFilter {
  return (questions, chapterId) => filterByChapterGroups(questions, chapterId, groups)
}

const chapterFilters: Partial<Record<SubjectId, ChapterFilter>> = Object.fromEntries(
  Object.entries(chapterGroups).map(([subjectId, groups]) => [subjectId, makeChapterFilter(groups)])
)

export function getChapterOptionsForSubject(subjectId: string): ChapterOption[] | null {
  return subjectChapterMap[subjectId as SubjectId] ?? null
}

export function hasChapterSupport(subjectId: string): boolean {
  return subjectId in chapterFilters
}

export function filterQuestionsBySubjectChapter<T extends ChapterQuestion>(subjectId: string, questions: T[], chapterId: ChapterId): T[] {
  if (chapterId === "all") return questions
  return chapterFilters[subjectId as SubjectId]?.(questions, chapterId) ?? questions
}
