import { describe, expect, it } from "vitest"
import {
  countAttemptsFromHistory,
  mergeAttemptCounts,
  parseAttemptCountMap,
  parseCount,
} from "./subjectAttemptStats"
import type { PracticeHistoryItem } from "./practiceSession"

describe("subject attempt stats", () => {
  it("parses bigint-like RPC values", () => {
    expect(parseCount(3)).toBe(3)
    expect(parseCount("4")).toBe(4)
    expect(parseCount(-1)).toBeNull()
  })

  it("keeps the highest known count when merging server and local totals", () => {
    expect(mergeAttemptCounts(
      { "tu-tuong-ho-chi-minh": 0 },
      { "tu-tuong-ho-chi-minh": 2, "toeic": 1 },
    )).toEqual({
      "tu-tuong-ho-chi-minh": 2,
      "toeic": 1,
    })
  })

  it("counts local practice history by subject", () => {
    const history = [
      { id: "a", subjectId: "tu-tuong-ho-chi-minh" },
      { id: "b", subjectId: "tu-tuong-ho-chi-minh" },
      { id: "c", subjectId: "toeic" },
    ] as PracticeHistoryItem[]
    expect(countAttemptsFromHistory(history)).toEqual({
      "tu-tuong-ho-chi-minh": 2,
      "toeic": 1,
    })
  })

  it("parses persisted count maps", () => {
    expect(parseAttemptCountMap({ "tu-tuong-ho-chi-minh": "3", bad: -2 })).toEqual({
      "tu-tuong-ho-chi-minh": 3,
    })
  })
})
