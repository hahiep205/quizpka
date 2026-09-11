-- Per-subject display overrides managed at /admin/subject.
-- Applied on top of the static catalog in src/data/subjects.ts so one edit
-- syncs the homepage and the dashboard. NULL text fields keep the original.

create table if not exists public.subject_display_overrides (
  subject_id text primary key,
  name_vi text,
  name_en text,
  title_vi text,
  title_en text,
  note_vi text,
  note_en text,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.subject_display_overrides enable row level security;

drop policy if exists "subject_overrides_read" on public.subject_display_overrides;
create policy "subject_overrides_read" on public.subject_display_overrides
  for select to anon, authenticated using (true);

-- Writes go through this admin-only RPC (no direct insert/update/delete policies).
create or replace function public.upsert_subject_override(
  p_subject_id text,
  p_name_vi text,
  p_name_en text,
  p_title_vi text,
  p_title_en text,
  p_note_vi text,
  p_note_en text,
  p_visible boolean
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
  insert into public.subject_display_overrides
    (subject_id, name_vi, name_en, title_vi, title_en, note_vi, note_en, visible, updated_at)
  values (
    p_subject_id,
    nullif(left(btrim(coalesce(p_name_vi, '')), 200), ''),
    nullif(left(btrim(coalesce(p_name_en, '')), 200), ''),
    nullif(left(btrim(coalesce(p_title_vi, '')), 200), ''),
    nullif(left(btrim(coalesce(p_title_en, '')), 200), ''),
    nullif(left(btrim(coalesce(p_note_vi, '')), 2000), ''),
    nullif(left(btrim(coalesce(p_note_en, '')), 2000), ''),
    p_visible, now()
  )
  on conflict (subject_id) do update set
    name_vi = excluded.name_vi,
    name_en = excluded.name_en,
    title_vi = excluded.title_vi,
    title_en = excluded.title_en,
    note_vi = excluded.note_vi,
    note_en = excluded.note_en,
    visible = excluded.visible,
    updated_at = now()
  returning * into v_row;
  return jsonb_build_object(
    'subject_id', v_row.subject_id,
    'visible', v_row.visible,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.upsert_subject_override(text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.upsert_subject_override(text, text, text, text, text, text, text, boolean) to authenticated;
