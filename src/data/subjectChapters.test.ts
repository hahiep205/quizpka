import { describe, expect, it } from "vitest"
import { filterQuestionsBySubjectChapter } from "@/data/subjectChapters"

describe("subject chapter filtering", () => {
  it("filters CNXH question ranges without mutating input", () => {
    const questions = [{ id: 28 }, { id: 29 }, { id: 57 }]
    expect(filterQuestionsBySubjectChapter("chu-nghia-xa-hoi-khoa-hoc", questions, "c2")).toEqual([{ id: 29 }])
    expect(questions).toHaveLength(3)
  })

  it("filters HCM chapter groups using the source chapter labels", () => {
    const questions = [{ id: 2, chapter: "C1, 2" }, { id: 3, chapter: "C1, 2" }, { id: 4, chapter: "C3, 4" }]
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c1")).toEqual([{ id: 2, chapter: "C1, 2" }])
  })
})
