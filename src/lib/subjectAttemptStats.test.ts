import { describe, expect, it } from "vitest"
import {
  countAttemptsFromHistory,
  formatSubjectAttemptLabel,
  mergeAttemptCounts,
  parseAttemptCountMap,
  parseCount,
  parseSubjectAttemptCounts,
} from "./subjectAttemptStats"
import type { PracticeHistoryItem } from "./practiceSession"

describe("subject attempt stats", () => {
  it("parses valid subject counts and ignores malformed rows", () => {
    expect(parseSubjectAttemptCounts([
      { subject_id: "tieng-anh-dau-vao", attempt_count: 12 },
      { subject_id: "tu-tuong-ho-chi-minh", attempt_count: "8" },
      { subject_id: "bad", attempt_count: -1 },
      { attempt_count: 3 },
      null,
    ])).toEqual({
      "tieng-anh-dau-vao": 12,
      "tu-tuong-ho-chi-minh": 8,
    })
  })

  it("returns an empty map for invalid payloads", () => {
    expect(parseSubjectAttemptCounts(null)).toEqual({})
    expect(parseSubjectAttemptCounts({})).toEqual({})
  })

  it("uses Vietnamese invariant copy and English pluralization", () => {
    expect(formatSubjectAttemptLabel(0, "vi")).toBe("lượt làm")
    expect(formatSubjectAttemptLabel(1, "vi")).toBe("lượt làm")
    expect(formatSubjectAttemptLabel(1, "en")).toBe("attempt")
    expect(formatSubjectAttemptLabel(2, "en")).toBe("attempts")
  })

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
