import type { AnswerValue, Question } from "@/features/quiz/model/quiz.types"

/** The grouping key two questions share when they belong to the same part. */
export function getPartKey(question: Question): string {
  return question.partTitle ?? question.id
}

/** Index of the first question of every contiguous part group. */
export function buildPartStartIndices(questions: Question[]): number[] {
  return questions.reduce<number[]>((indices, question, index) => {
    if (index === 0 || getPartKey(question) !== getPartKey(questions[index - 1])) indices.push(index)
    return indices
  }, [])
}

/** Questions that belong to the given part key. */
export function getPartQuestions(questions: Question[], partKey: string): Question[] {
  return questions.filter((question) => getPartKey(question) === partKey)
}

/** O(1) lookup from question id to its 1-based number (replaces repeated findIndex scans). */
export function buildQuestionNumberMap(questions: Question[]): Map<string, number> {
  const map = new Map<string, number>()
  questions.forEach((question, index) => {
    map.set(question.id, index + 1)
  })
  return map
}

/** Index of the first question of the part the given part questions belong to. */
export function getCurrentPartStartIndex(questions: Question[], partQuestions: Question[]): number {
  if (partQuestions.length === 0) return 0
  return questions.findIndex((question) => question.id === partQuestions[0].id)
}

export type PartNavigationItem = {
  startIndex: number
  label: string
}

/** Navigation tiles "Part N - Section" used by TADV exams. */
export function buildPartNavigationItems(questions: Question[], startIndices: number[]): PartNavigationItem[] {
  return startIndices.map((startIndex, index) => {
    const firstQuestion = questions[startIndex]
    const partNumber = firstQuestion.partTitle?.match(/PART\s+(\d+)/i)?.[1] ?? String(index + 1)
    const label = `Part ${partNumber} - ${firstQuestion.section ?? "Quiz"}`
    return { startIndex, label }
  })
}

export type ToeicGroup = {
  start: number
  end: number
  count: number
  partLabel: string
  groupLabel: string
  title: string
}

/** Collapses consecutive TOEIC questions into question/group tiles for the sidebar. */
export function buildToeicGroups(questions: Question[], startIndices: number[]): ToeicGroup[] {
  const partCounters = new Map<string, number>()
  return startIndices.map((start, idx) => {
    const end = idx < startIndices.length - 1 ? startIndices[idx + 1] : questions.length
    const count = end - start
    const title = questions[start]?.partTitle ?? `Group ${idx + 1}`
    const partNum = title.match(/Part\s+(\d+)/i)?.[1]
    const groupNum = title.match(/Group\s+(\d+)/i)?.[1]
    const qNum = title.match(/Q\s*(\d+)/i)?.[1]
    const partKey = partNum ? `Part ${partNum}` : title.split(" - ")[1] ?? `group-${idx}`
    const nextInPart = (partCounters.get(partKey) ?? 0) + 1
    partCounters.set(partKey, nextInPart)
    let groupLabel = ""
    if (groupNum) groupLabel = `Nhóm ${groupNum}`
    else if (qNum) groupLabel = `Câu ${qNum}`
    else groupLabel = `Nhóm ${nextInPart}`
    const partLabel = partNum ? `Part ${partNum}` : title.split(" - ")[1] ?? `Nhóm ${idx + 1}`
    return { start, end, count, title, partLabel, groupLabel }
  })
}

export type ToeicTwoLevelPart = {
  partNum: string
  partLabel: string
  totalQuestions: number
  firstStart: number
}

export type ToeicTwoLevelData = {
  partList: ToeicTwoLevelPart[]
  selectedPartNum: string | null
  filteredGroups: ToeicGroup[]
}

/** Two-level sidebar (part tiles on top, group tiles below) for full/listening/reading scopes. */
export function buildToeicTwoLevelData(groups: ToeicGroup[], currentIndex: number): ToeicTwoLevelData | null {
  if (groups.length === 0) return null
  const partMap = new Map<string, ToeicTwoLevelPart>()
  for (const group of groups) {
    const partNum = group.partLabel.match(/Part\s+(\d+)/)?.[1] ?? group.partLabel
    const existing = partMap.get(partNum)
    if (existing) existing.totalQuestions += group.count
    else partMap.set(partNum, { partNum, partLabel: group.partLabel, totalQuestions: group.count, firstStart: group.start })
  }
  const partList = Array.from(partMap.values()).sort((a, b) => Number(a.partNum) - Number(b.partNum))
  const currentGroup = groups.find((group) => currentIndex >= group.start && currentIndex < group.end)
  const selectedPartNum = currentGroup
    ? currentGroup.partLabel.match(/Part\s+(\d+)/)?.[1] ?? partList[0]?.partNum ?? null
    : partList[0]?.partNum ?? null
  const filteredGroups = selectedPartNum ? groups.filter((group) => group.partLabel === `Part ${selectedPartNum}`) : []
  return { partList, selectedPartNum, filteredGroups }
}

/** Number of answered questions within [start, end) without allocating intermediate arrays. */
export function countAnsweredInRange(questions: Question[], answers: Record<string, AnswerValue>, start: number, end: number): number {
  let count = 0
  for (let i = start; i < end; i += 1) {
    if (answers[questions[i]?.id] !== undefined) count += 1
  }
  return count
}

/** Removes the internal "part6_group_X_Y" suffix used for display titles. */
export function stripPart6GroupSuffix(partTitle: string): string {
  return partTitle.replace(/\s+-\s+part6_group_\d+_\d+$/i, "")
}
