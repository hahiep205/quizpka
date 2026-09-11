import { supabase } from "@/lib/supabase"

export type SubjectDisplayOverride = {
  subjectId: string
  nameVi: string | null
  nameEn: string | null
  titleVi: string | null
  titleEn: string | null
  noteVi: string | null
  noteEn: string | null
  visible: boolean
}

type OverrideRow = {
  subject_id: string
  name_vi: string | null
  name_en: string | null
  title_vi: string | null
  title_en: string | null
  note_vi: string | null
  note_en: string | null
  visible: boolean
}

function toOverride(row: OverrideRow): SubjectDisplayOverride {
  return {
    subjectId: row.subject_id,
    nameVi: row.name_vi,
    nameEn: row.name_en,
    titleVi: row.title_vi,
    titleEn: row.title_en,
    noteVi: row.note_vi,
    noteEn: row.note_en,
    visible: row.visible,
  }
}

export async function fetchSubjectOverrides(): Promise<SubjectDisplayOverride[]> {
  const { data, error } = await supabase
    .from("subject_display_overrides")
    .select("subject_id,name_vi,name_en,title_vi,title_en,note_vi,note_en,visible")
  if (error) throw new Error(error.message)
  return ((data ?? []) as OverrideRow[]).map(toOverride)
}

export type SaveSubjectOverrideInput = {
  subjectId: string
  nameVi?: string | null
  nameEn?: string | null
  titleVi?: string | null
  titleEn?: string | null
  noteVi?: string | null
  noteEn?: string | null
  visible: boolean
}

export async function saveSubjectOverride(input: SaveSubjectOverrideInput): Promise<void> {
  const { error } = await supabase.rpc("upsert_subject_override", {
    p_subject_id: input.subjectId,
    p_name_vi: input.nameVi ?? null,
    p_name_en: input.nameEn ?? null,
    p_title_vi: input.titleVi ?? null,
    p_title_en: input.titleEn ?? null,
    p_note_vi: input.noteVi ?? null,
    p_note_en: input.noteEn ?? null,
    p_visible: input.visible,
  })
  if (error) throw new Error(error.message)
}
