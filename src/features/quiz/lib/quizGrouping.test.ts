import { describe, expect, it } from "vitest"
import type { Question } from "@/features/quiz/model/quiz.types"
import {
  buildPartNavigationItems,
  buildPartStartIndices,
  buildQuestionNumberMap,
  buildToeicGroups,
  buildToeicTwoLevelData,
  countAnsweredInRange,
  getCurrentPartStartIndex,
  getPartKey,
  getPartQuestions,
  stripPart6GroupSuffix,
} from "@/features/quiz/lib/quizGrouping"

function question(id: string, partTitle?: string, section?: "Listening" | "Reading"): Question {
  return {
    id,
    prompt: `${id} prompt`,
    options: ["A", "B"],
    ...(partTitle ? { partTitle } : {}),
    ...(section ? { section } : {}),
  }
}

// Realistic TOEIC shapes: Part 1/2/5 questions carry a unique "Q n" title (one group each),
// while Part 3/6/7 group several questions under a shared "Group n" title.
const toeicQuestions = [
  question("p1-q1", "Listening - Part 1 - Q1", "Listening"),
  question("p1-q2", "Listening - Part 1 - Q2", "Listening"),
  question("p3g1-q1", "Listening - Part 3 - Group 1", "Listening"),
  question("p3g1-q2", "Listening - Part 3 - Group 1", "Listening"),
  question("p3g1-q3", "Listening - Part 3 - Group 1", "Listening"),
  question("p3g2-q1", "Listening - Part 3 - Group 2", "Listening"),
  question("p3g2-q2", "Listening - Part 3 - Group 2", "Listening"),
  question("p3g2-q3", "Listening - Part 3 - Group 2", "Listening"),
  question("p5-q1", "Reading - Part 5 - Q15", "Reading"),
]

describe("quizGrouping", () => {
  it("uses partTitle as the part key, falling back to the id", () => {
    expect(getPartKey(question("a", "Reading - Part 5 - Q1", "Reading"))).toBe("Reading - Part 5 - Q1")
    expect(getPartKey(question("a"))).toBe("a")
  })

  it("records the start index of every contiguous part", () => {
    expect(buildPartStartIndices(toeicQuestions)).toEqual([0, 1, 2, 5, 8])
  })

  it("filters questions belonging to one part key", () => {
    const part = getPartQuestions(toeicQuestions, "Listening - Part 3 - Group 1")
    expect(part.map((q) => q.id)).toEqual(["p3g1-q1", "p3g1-q2", "p3g1-q3"])
  })

  it("builds a 1-based number map for O(1) lookups", () => {
    const map = buildQuestionNumberMap(toeicQuestions)
    expect(map.get("p3g2-q1")).toBe(6)
    expect(map.get("unknown")).toBeUndefined()
  })

  it("resolves the current part start index from its first question", () => {
    const part = getPartQuestions(toeicQuestions, "Listening - Part 3 - Group 2")
    expect(getCurrentPartStartIndex(toeicQuestions, part)).toBe(5)
  })

  it("builds Part navigation tiles with section names (TADV style)", () => {
    const items = buildPartNavigationItems(toeicQuestions, buildPartStartIndices(toeicQuestions))
    expect(items[0].label).toBe("Part 1 - Listening")
    expect(items[1].startIndex).toBe(1)
    expect(items[4].label).toBe("Part 5 - Reading")
  })

  it("collapses consecutive questions into group tiles with Vietnamese labels", () => {
    const groups = buildToeicGroups(toeicQuestions, buildPartStartIndices(toeicQuestions))
    expect(groups).toHaveLength(5)
    expect(groups[0]).toMatchObject({ start: 0, end: 1, count: 1, partLabel: "Part 1", groupLabel: "Câu 1" })
    expect(groups[1]).toMatchObject({ start: 1, end: 2, count: 1, partLabel: "Part 1", groupLabel: "Câu 2" })
    expect(groups[2]).toMatchObject({ start: 2, end: 5, count: 3, partLabel: "Part 3", groupLabel: "Nhóm 1" })
    expect(groups[3]).toMatchObject({ start: 5, end: 8, count: 3, partLabel: "Part 3", groupLabel: "Nhóm 2" })
    expect(groups[4]).toMatchObject({ start: 8, end: 9, count: 1, partLabel: "Part 5", groupLabel: "Câu 15" })
  })

  it("builds two-level data: parts sorted, current part selected, groups filtered", () => {
    const groups = buildToeicGroups(toeicQuestions, buildPartStartIndices(toeicQuestions))
    const data = buildToeicTwoLevelData(groups, 6) // inside Part 3 Group 2
    expect(data).not.toBeNull()
    expect(data!.partList.map((part) => part.partNum)).toEqual(["1", "3", "5"])
    expect(data!.partList[0]!.totalQuestions).toBe(2)
    expect(data!.selectedPartNum).toBe("3")
    expect(data!.filteredGroups.map((group) => group.groupLabel)).toEqual(["Nhóm 1", "Nhóm 2"])
  })

  it("counts answered questions inside a range without mutating input", () => {
    const answers = { "p3g1-q1": 0, "p3g1-q2": 1 }
    expect(countAnsweredInRange(toeicQuestions, answers, 2, 5)).toBe(2)
    expect(countAnsweredInRange(toeicQuestions, answers, 5, 8)).toBe(0)
  })

  it("strips the internal part6 group suffix from display titles", () => {
    expect(stripPart6GroupSuffix("Reading - Part 6 - part6_group_1_2")).toBe("Reading - Part 6")
    expect(stripPart6GroupSuffix("Reading - Part 7 - Group 1")).toBe("Reading - Part 7 - Group 1")
  })
})
