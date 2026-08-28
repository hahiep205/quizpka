import type { SubjectId } from "@/data/subjects"

/**
 * Subjects where the per-question explanation ("Giải thích: ...")
 * is hidden in the quiz UI and the review panel.
 */
export const HIDE_EXPLANATION_SUBJECT_IDS: readonly SubjectId[] = [
  "tu-tuong-ho-chi-minh",
  "lich-su-dang-cong-san-viet-nam",
  "quan-tri-hoc",
  "triet-hoc-mac-lenin-2tc",
  "triet-hoc-mac-lenin-3tc",
  "ky-nang-quan-ly-du-an",
  "chu-nghia-xa-hoi-khoa-hoc",
  "ky-nang-khoi-nghiep-va-lanh-dao",
  "bao-mat-ung-dung-he-thong",
]

export function shouldHideExplanation(subjectId: SubjectId): boolean {
  return HIDE_EXPLANATION_SUBJECT_IDS.includes(subjectId)
}
