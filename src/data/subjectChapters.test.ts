import { describe, expect, it } from "vitest"
import { filterQuestionsBySubjectChapter } from "@/data/subjectChapters"

describe("subject chapter filtering", () => {
  it("filters CNXH chapter groups by chapter label prefix after the split", () => {
    const questions = [
      { id: 1, chapter: "Chương 1: Nhập môn Chủ nghĩa xã hội khoa học" },
      { id: 2, chapter: "Chương 2: Sứ mệnh lịch sử của giai cấp công nhân" },
      { id: 3, chapter: "Chương 4: Dân chủ xã hội chủ nghĩa và Nhà nước xã hội chủ nghĩa" },
      { id: 4, chapter: "Chương 5: Cơ cấu xã hội – giai cấp và liên minh giai cấp" },
    ]
    expect(filterQuestionsBySubjectChapter("chu-nghia-xa-hoi-khoa-hoc", questions, "c1")).toEqual([{ id: 1, chapter: "Chương 1: Nhập môn Chủ nghĩa xã hội khoa học" }])
    expect(filterQuestionsBySubjectChapter("chu-nghia-xa-hoi-khoa-hoc", questions, "c1234_mid")).toEqual([
      { id: 1, chapter: "Chương 1: Nhập môn Chủ nghĩa xã hội khoa học" },
      { id: 2, chapter: "Chương 2: Sứ mệnh lịch sử của giai cấp công nhân" },
      { id: 3, chapter: "Chương 4: Dân chủ xã hội chủ nghĩa và Nhà nước xã hội chủ nghĩa" },
    ])
    expect(filterQuestionsBySubjectChapter("chu-nghia-xa-hoi-khoa-hoc", questions, "c567_final")).toEqual([{ id: 4, chapter: "Chương 5: Cơ cấu xã hội – giai cấp và liên minh giai cấp" }])
    expect(questions).toHaveLength(4)
  })

  it("filters HCM chapter groups by the split chapter labels", () => {
    const questions = [
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 3" },
      { id: 4, chapter: "Chương 4" },
      { id: 5, chapter: "Chương 5" },
      { id: 6, chapter: "Chương 6" },
    ]
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c1")).toEqual([{ id: 1, chapter: "Chương 1" }])
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c2")).toEqual([{ id: 2, chapter: "Chương 2" }])
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c4")).toEqual([{ id: 4, chapter: "Chương 4" }])
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c6")).toEqual([{ id: 6, chapter: "Chương 6" }])
    expect(questions).toHaveLength(6)
  })

  it("filters HCM midterm and final groups by the split chapter labels", () => {
    const questions = [
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 3" },
      { id: 4, chapter: "Chương 4" },
      { id: 5, chapter: "Chương 5" },
      { id: 6, chapter: "Chương 6" },
    ]
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c123_mid")).toEqual([
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 3" },
    ])
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "c456_final")).toEqual([
      { id: 4, chapter: "Chương 4" },
      { id: 5, chapter: "Chương 5" },
      { id: 6, chapter: "Chương 6" },
    ])
  })

  it("filters HCM suu tam by the collected-question labels", () => {
    const questions = [
      { id: 1, chapter: "Câu hỏi sưu tầm" },
      { id: 2, chapter: "Câu Hỏi Trong SLIDE" },
      { id: 3, chapter: "Chương 3" },
    ]
    expect(filterQuestionsBySubjectChapter("tu-tuong-ho-chi-minh", questions, "suutam")).toEqual([
      { id: 1, chapter: "Câu hỏi sưu tầm" },
      { id: 2, chapter: "Câu Hỏi Trong SLIDE" },
    ])
  })

  it("filters QTH collected questions and chapter groups after the split", () => {
    const questions = [
      { id: 1, chapter: "Câu hỏi sưu tầm" },
      { id: 2, chapter: "Chương 1" },
      { id: 3, chapter: "Chương 4" },
      { id: 4, chapter: "Chương 5" },
      { id: 5, chapter: "Chương 7" },
    ]
    expect(filterQuestionsBySubjectChapter("quan-tri-hoc", questions, "suutam")).toEqual([{ id: 1, chapter: "Câu hỏi sưu tầm" }])
    expect(filterQuestionsBySubjectChapter("quan-tri-hoc", questions, "c1234_mid")).toEqual([
      { id: 2, chapter: "Chương 1" },
      { id: 3, chapter: "Chương 4" },
    ])
    expect(filterQuestionsBySubjectChapter("quan-tri-hoc", questions, "c567_final")).toEqual([
      { id: 4, chapter: "Chương 5" },
      { id: 5, chapter: "Chương 7" },
    ])
  })
  it("filters MLN 2tc chapters after the split", () => {
    const questions = [
      { id: 1, chapter: "Câu hỏi sưu tầm" },
      { id: 2, chapter: "Chương 1" },
      { id: 3, chapter: "Chương 2" },
      { id: 4, chapter: "Chương 3" },
    ]
    expect(filterQuestionsBySubjectChapter("triet-hoc-mac-lenin-2tc", questions, "suutam")).toEqual([{ id: 1, chapter: "Câu hỏi sưu tầm" }])
    expect(filterQuestionsBySubjectChapter("triet-hoc-mac-lenin-2tc", questions, "c12_mid")).toEqual([
      { id: 2, chapter: "Chương 1" },
      { id: 3, chapter: "Chương 2" },
    ])
    expect(filterQuestionsBySubjectChapter("triet-hoc-mac-lenin-2tc", questions, "c3_final")).toEqual([{ id: 4, chapter: "Chương 3" }])
  })

  it("filters MLN 3tc chapters after the split", () => {
    const questions = [
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 3" },
    ]
    expect(filterQuestionsBySubjectChapter("triet-hoc-mac-lenin-3tc", questions, "c12_mid")).toEqual([
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
    ])
    expect(filterQuestionsBySubjectChapter("triet-hoc-mac-lenin-3tc", questions, "c3_final")).toEqual([{ id: 3, chapter: "Chương 3" }])
  })
  it("filters PM chapter groups after the split", () => {
    const questions = [
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 5" },
      { id: 4, chapter: "Chương 6" },
      { id: 5, chapter: "Chương 8" },
    ]
    expect(filterQuestionsBySubjectChapter("ky-nang-quan-ly-du-an", questions, "c1")).toEqual([{ id: 1, chapter: "Chương 1" }])
    expect(filterQuestionsBySubjectChapter("ky-nang-quan-ly-du-an", questions, "c12345_mid")).toEqual([
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 5" },
    ])
    expect(filterQuestionsBySubjectChapter("ky-nang-quan-ly-du-an", questions, "c678_final")).toEqual([
      { id: 4, chapter: "Chương 6" },
      { id: 5, chapter: "Chương 8" },
    ])
  })
  it("filters KNLD chapter groups after the split", () => {
    const questions = [
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
      { id: 3, chapter: "Chương 4" },
      { id: 4, chapter: "Chương 5" },
    ]
    expect(filterQuestionsBySubjectChapter("ky-nang-khoi-nghiep-va-lanh-dao", questions, "c1")).toEqual([{ id: 1, chapter: "Chương 1" }])
    expect(filterQuestionsBySubjectChapter("ky-nang-khoi-nghiep-va-lanh-dao", questions, "c123_mid")).toEqual([
      { id: 1, chapter: "Chương 1" },
      { id: 2, chapter: "Chương 2" },
    ])
    expect(filterQuestionsBySubjectChapter("ky-nang-khoi-nghiep-va-lanh-dao", questions, "c45_final")).toEqual([
      { id: 3, chapter: "Chương 4" },
      { id: 4, chapter: "Chương 5" },
    ])
  })
})