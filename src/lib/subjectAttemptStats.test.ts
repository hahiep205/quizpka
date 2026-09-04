import { describe, expect, it } from "vitest"
import { formatSubjectAttemptLabel, parseSubjectAttemptCounts } from "./subjectAttemptStats"

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
})
