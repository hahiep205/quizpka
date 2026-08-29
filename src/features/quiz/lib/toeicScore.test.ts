import { describe, expect, it } from "vitest"
import { getSectionScores, sectionScore } from "@/features/quiz/lib/toeicScore"

describe("TOEIC score estimation", () => {
  it("returns the minimum 5 when nothing is correct", () => {
    expect(sectionScore(0, 100)).toBe(5)
    expect(sectionScore(0, 0)).toBe(5)
  })

  it("returns the maximum 495 when everything is correct", () => {
    expect(sectionScore(100, 100)).toBe(495)
    expect(sectionScore(200, 200)).toBe(495)
  })

  it("scales linearly in between", () => {
    expect(sectionScore(50, 100)).toBe(250)
    expect(sectionScore(25, 100)).toBe(128) // 5 + 490*0.25 = 127.5 -> 128
  })

  it("keeps the section total inside 10..990", () => {
    const empty = getSectionScores(0, 100, 0, 100)
    expect(empty.listening).toBe(5)
    expect(empty.reading).toBe(5)
    expect(empty.total).toBe(10)
    const perfect = getSectionScores(100, 100, 100, 100)
    expect(perfect.total).toBe(990)
  })
})
