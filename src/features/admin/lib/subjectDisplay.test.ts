import { describe, expect, it } from "vitest"
import type { ExamCatalogItem } from "@/data/subjects"
import {
  applySubjectDisplayOverrides,
  filterVisibleSubjectExams,
  getSubjectDisplayName,
  isSubjectVisible,
  overrideMapBySubject,
} from "@/features/admin/lib/subjectDisplay"

type SubjectId = ExamCatalogItem["subjectId"]
const A = "a" as SubjectId
const B = "b" as SubjectId

function exam(id: string, subjectId: SubjectId): ExamCatalogItem {
  return {
    id,
    subjectId,
    subjectCode: "X101",
    subjectName: { en: "Orig Name", vi: "Tên gốc" },
    category: { en: "General", vi: "Đại cương" },
    type: "final",
    year: 2026,
    questionCount: 10,
    durationMinutes: 60,
    title: { en: "Orig Title", vi: "Tiêu đề gốc" },
    description: { en: "Orig desc", vi: "Mô tả gốc" },
  }
}

describe("subject display overrides", () => {
  it("keeps originals without overrides and hides nothing by default", () => {
    const map = overrideMapBySubject([])
    expect(isSubjectVisible(A, map)).toBe(true)
    const items = [exam("e1", A)]
    expect(applySubjectDisplayOverrides(items, map)).toBe(items)
    expect(filterVisibleSubjectExams(items, map)).toBe(items)
  })

  it("applies name/title/note per subject and filters hidden subjects", () => {
    const map = overrideMapBySubject([
      { subjectId: "a", nameVi: "Tên mới", nameEn: null, titleVi: null, titleEn: "New Title", noteVi: "Ghi chú mới", noteEn: null, visible: true },
      { subjectId: "b", nameVi: null, nameEn: null, titleVi: null, titleEn: null, noteVi: null, noteEn: null, visible: false },
    ])
    const [applied] = applySubjectDisplayOverrides([exam("e1", A)], map)
    expect(applied.subjectName).toEqual({ en: "Orig Name", vi: "Tên mới" })
    expect(applied.title).toEqual({ en: "New Title", vi: "Tiêu đề gốc" })
    expect(applied.description).toEqual({ en: "Orig desc", vi: "Ghi chú mới" })
    expect(isSubjectVisible(B, map)).toBe(false)
    expect(filterVisibleSubjectExams([exam("e1", A), exam("e2", B)], map).map((e) => e.id)).toEqual(["e1"])
  })

  it("treats blank override text as keep-original", () => {
    const map = overrideMapBySubject([
      { subjectId: "a", nameVi: "   ", nameEn: null, titleVi: null, titleEn: null, noteVi: null, noteEn: null, visible: true },
    ])
    expect(getSubjectDisplayName({ name: { en: "N", vi: "T" } }, map.get(A))).toEqual({ en: "N", vi: "T" })
  })
})
