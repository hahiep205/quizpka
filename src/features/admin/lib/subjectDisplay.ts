import type { ExamCatalogItem, Subject } from "@/data/subjects"
import type { SubjectDisplayOverride } from "@/features/admin/api/subjectOverrides"

export function overrideMapBySubject(overrides: SubjectDisplayOverride[]): Map<string, SubjectDisplayOverride> {
  return new Map(overrides.map((override) => [override.subjectId, override]))
}

export function isSubjectVisible(subjectId: string, overrides: Map<string, SubjectDisplayOverride>): boolean {
  return overrides.get(subjectId)?.visible ?? true
}

/** Display name of a subject with an admin override applied (null/empty keeps the original). */
export function getSubjectDisplayName(
  subject: Pick<Subject, "name">,
  override: SubjectDisplayOverride | undefined,
): { en: string; vi: string } {
  if (!override) return subject.name
  return {
    en: override.nameEn?.trim() ? override.nameEn.trim() : subject.name.en,
    vi: override.nameVi?.trim() ? override.nameVi.trim() : subject.name.vi,
  }
}

/**
 * Applies admin display overrides (from /admin/subject) to catalog items.
 * Title/note overrides replace every exam's title/description of that subject.
 * Returns the same item references when nothing applies.
 */
export function applySubjectDisplayOverrides(
  exams: ExamCatalogItem[],
  overrides: Map<string, SubjectDisplayOverride>,
): ExamCatalogItem[] {
  if (overrides.size === 0) return exams
  return exams.map((exam) => {
    const override = overrides.get(exam.subjectId)
    if (!override) return exam
    const titleVi = override.titleVi?.trim()
    const titleEn = override.titleEn?.trim()
    const noteVi = override.noteVi?.trim()
    const noteEn = override.noteEn?.trim()
    const nameVi = override.nameVi?.trim()
    const nameEn = override.nameEn?.trim()
    if (!titleVi && !titleEn && !noteVi && !noteEn && !nameVi && !nameEn) return exam
    return {
      ...exam,
      title: { en: titleEn || exam.title.en, vi: titleVi || exam.title.vi },
      description: { en: noteEn || exam.description.en, vi: noteVi || exam.description.vi },
      subjectName: { en: nameEn || exam.subjectName.en, vi: nameVi || exam.subjectName.vi },
    }
  })
}

/** Drops catalog items whose subject is hidden by an admin override. */
export function filterVisibleSubjectExams(
  exams: ExamCatalogItem[],
  overrides: Map<string, SubjectDisplayOverride>,
): ExamCatalogItem[] {
  if (overrides.size === 0) return exams
  return exams.filter((exam) => isSubjectVisible(exam.subjectId, overrides))
}
