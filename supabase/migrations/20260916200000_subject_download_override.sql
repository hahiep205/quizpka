-- Download gate for /dashboard/downloads, managed at /admin/downloads.
-- Reuses subject_display_overrides so one row per subject controls catalog
-- visibility AND pdf download permission. Defaults keep current behavior
-- (everything downloadable) until an admin toggles a subject off.

alter table public.subject_display_overrides
  add column if not exists downloadable boolean not null default true;

-- Replace the 8-arg upsert with a 9-arg version carrying p_downloadable.
drop function if exists public.upsert_subject_override(text, text, text, text, text, text, text, boolean);

create or replace function public.upsert_subject_override(
  p_subject_id text,
  p_name_vi text,
  p_name_en text,
  p_title_vi text,
  p_title_en text,
  p_note_vi text,
  p_note_en text,
  p_visible boolean,
  p_downloadable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subject_display_overrides%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;
  if p_subject_id is null or char_length(p_subject_id) < 1 or char_length(p_subject_id) > 120 then
    raise exception 'Invalid subject id' using errcode = '22023';
  end if;
  if p_visible is null then
    raise exception 'Visible flag is required' using errcode = '22023';
  end if;
  if p_downloadable is null then
    raise exception 'Downloadable flag is required' using errcode = '22023';
  end if;
  insert into public.subject_display_overrides
    (subject_id, name_vi, name_en, title_vi, title_en, note_vi, note_en, visible, downloadable, updated_at)
  values (
    p_subject_id,
    nullif(left(btrim(coalesce(p_name_vi, '')), 200), ''),
    nullif(left(btrim(coalesce(p_name_en, '')), 200), ''),
    nullif(left(btrim(coalesce(p_title_vi, '')), 200), ''),
    nullif(left(btrim(coalesce(p_title_en, '')), 200), ''),
    nullif(left(btrim(coalesce(p_note_vi, '')), 2000), ''),
    nullif(left(btrim(coalesce(p_note_en, '')), 2000), ''),
    p_visible, p_downloadable, now()
  )
  on conflict (subject_id) do update set
    name_vi = excluded.name_vi,
    name_en = excluded.name_en,
    title_vi = excluded.title_vi,
    title_en = excluded.title_en,
    note_vi = excluded.note_vi,
    note_en = excluded.note_en,
    visible = excluded.visible,
    downloadable = excluded.downloadable,
    updated_at = now()
  returning * into v_row;
  return jsonb_build_object(
    'subject_id', v_row.subject_id,
    'visible', v_row.visible,
    'downloadable', v_row.downloadable,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.upsert_subject_override(text, text, text, text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.upsert_subject_override(text, text, text, text, text, text, text, boolean, boolean) to authenticated;
