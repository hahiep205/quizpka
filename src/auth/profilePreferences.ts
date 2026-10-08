export const SCHOOL_OR_FACULTY_OPTIONS = [
  { value: "engineering_phenikaa", label: "Trường Kỹ thuật Phenikaa" },
  { value: "information_technology_phenikaa", label: "Trường Công nghệ thông tin Phenikaa" },
  { value: "economics_phenikaa", label: "Trường Kinh tế Phenikaa" },
  { value: "interdisciplinary_digital_technology_phenikaa", label: "Trường Công nghệ số liên ngành Phenikaa" },
  { value: "medicine_pharmacy_phenikaa", label: "Trường Y - Dược Phenikaa" },
  { value: "foreign_languages_social_sciences_phenikaa", label: "Trường Ngoại ngữ - Khoa học Xã hội Phenikaa" },
  { value: "law", label: "Khoa Luật" },
  { value: "tourism_hospitality", label: "Khoa Du lịch - Khách sạn" },
  { value: "basic_sciences", label: "Khoa Khoa học cơ bản" },
] as const

export const COHORT_OPTIONS = ["K15", "K16", "K17", "K18", "K19", "K20"] as const

export type SchoolOrFaculty = (typeof SCHOOL_OR_FACULTY_OPTIONS)[number]["value"]
export type Cohort = (typeof COHORT_OPTIONS)[number]
export type UserPreferences = {
  school_or_faculty: SchoolOrFaculty | null
  cohort: Cohort | null
  preferred_language: "vi" | "en"
  sound_enabled: boolean
  email_updates_enabled: boolean
}

export type UserProfileUpdates = Partial<{
  display_name: string | null
  school_or_faculty: SchoolOrFaculty | null
  cohort: Cohort | null
  preferred_language: "vi" | "en"
  sound_enabled: boolean
  email_updates_enabled: boolean
}>

export function schoolOrFacultyLabel(value: string | null | undefined): string | null {
  return SCHOOL_OR_FACULTY_OPTIONS.find((option) => option.value === value)?.label ?? null
}
