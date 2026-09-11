import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { subjects, type Subject } from "@/data/subjects"
import { getPaidProductId } from "@/lib/purchases"
import { cn } from "@/lib/utils"
import { refreshSubjectOverrides, useSubjectOverrides } from "@/hooks/useSubjectOverrides"
import { saveSubjectOverride } from "@/features/admin/api/subjectOverrides"

type Lang = "vi" | "en"

type Draft = {
  nameVi: string
  nameEn: string
  titleVi: string
  titleEn: string
  noteVi: string
  noteEn: string
  visible: boolean
}

function draftFrom(current: {
  nameVi: string | null
  nameEn: string | null
  titleVi: string | null
  titleEn: string | null
  noteVi: string | null
  noteEn: string | null
  visible: boolean
} | undefined): Draft {
  return {
    nameVi: current?.nameVi ?? "",
    nameEn: current?.nameEn ?? "",
    titleVi: current?.titleVi ?? "",
    titleEn: current?.titleEn ?? "",
    noteVi: current?.noteVi ?? "",
    noteEn: current?.noteEn ?? "",
    visible: current?.visible ?? true,
  }
}

const inputClassName =
  "h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-semibold text-[#100F3E] outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white"

export function SubjectManager({ lang }: { lang: Lang }) {
  const overrides = useSubjectOverrides()
  const [query, setQuery] = useState("")
  const [paidFilter, setPaidFilter] = useState<"all" | "free" | "paid">("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return subjects.filter((subject) => {
      const isPaid = getPaidProductId(subject.code) !== null
      if (paidFilter === "free" && isPaid) return false
      if (paidFilter === "paid" && !isPaid) return false
      if (!normalized) return true
      return `${subject.code} ${subject.name.vi} ${subject.name.en}`.toLowerCase().includes(normalized)
    })
  }, [paidFilter, query])

  const openEditor = (subject: Subject) => {
    setEditingId(subject.id)
    setDraft(draftFrom(overrides.get(subject.id)))
    setResult(null)
  }

  const save = async (subject: Subject) => {
    if (!draft || savingId) return
    setSavingId(subject.id)
    setResult(null)
    try {
      await saveSubjectOverride({
        subjectId: subject.id,
        nameVi: draft.nameVi.trim() || null,
        nameEn: draft.nameEn.trim() || null,
        titleVi: draft.titleVi.trim() || null,
        titleEn: draft.titleEn.trim() || null,
        noteVi: draft.noteVi.trim() || null,
        noteEn: draft.noteEn.trim() || null,
        visible: draft.visible,
      })
      await refreshSubjectOverrides()
      setEditingId(null)
      setDraft(null)
      setResult({ ok: true, message: lang === "vi" ? `Đã lưu hiển thị môn ${subject.code}. Trang chủ và dashboard sẽ đồng bộ.` : `Saved display for ${subject.code}. Homepage and dashboard will sync.` })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : lang === "vi" ? "Không thể lưu." : "Unable to save." })
    } finally {
      setSavingId(null)
    }
  }

  const resetToDefault = async (subject: Subject) => {
    if (savingId) return
    setSavingId(subject.id)
    setResult(null)
    try {
      await saveSubjectOverride({ subjectId: subject.id, visible: true })
      await refreshSubjectOverrides()
      setEditingId(null)
      setDraft(null)
      setResult({ ok: true, message: lang === "vi" ? `Đã khôi phục gốc môn ${subject.code}.` : `Reset ${subject.code} to defaults.` })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : lang === "vi" ? "Không thể lưu." : "Unable to save." })
    } finally {
      setSavingId(null)
    }
  }

  const toggleVisible = async (subject: Subject, visible: boolean) => {
    if (savingId) return
    setSavingId(subject.id)
    setResult(null)
    try {
      const current = overrides.get(subject.id)
      await saveSubjectOverride({
        subjectId: subject.id,
        nameVi: current?.nameVi ?? null,
        nameEn: current?.nameEn ?? null,
        titleVi: current?.titleVi ?? null,
        titleEn: current?.titleEn ?? null,
        noteVi: current?.noteVi ?? null,
        noteEn: current?.noteEn ?? null,
        visible,
      })
      await refreshSubjectOverrides()
      setResult({ ok: true, message: lang === "vi" ? `Đã ${visible ? "hiện" : "ẩn"} môn ${subject.code}.` : `${subject.code} is now ${visible ? "visible" : "hidden"}.` })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : lang === "vi" ? "Không thể lưu." : "Unable to save." })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section id="admin-subject" className="scroll-mt-24 space-y-4 sm:space-y-5">
      <Card className="space-y-3 p-4 sm:p-5">
        <p className="text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
          {lang === "vi"
            ? "Sửa tên, tiêu đề, ghi chú và bật/tắt hiển thị từng môn. Một lần sửa đồng bộ cả trang chủ và dashboard. Tiêu đề/ghi chú áp dụng cho mọi đề của môn. Để trống là giữ gốc."
            : "Edit names, titles, notes, and visibility per subject. One edit syncs both the homepage and dashboard. Title/note apply to every exam of the subject. Leave blank to keep the original."}
        </p>
        {result ? (
          <p role={result.ok ? "status" : "alert"} className={cn("rounded-xl px-3 py-2 text-sm font-bold", result.ok ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>
            {result.message}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "vi" ? "Tìm mã / tên môn…" : "Search code / name…"}
              className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <div className="flex gap-2">
            {(["all", "free", "paid"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaidFilter(value)}
                className={cn("lp-chip min-h-9 justify-center px-3 text-xs", paidFilter === value && "is-active")}
              >
                {value === "all" ? (lang === "vi" ? "Tất cả" : "All") : value === "free" ? (lang === "vi" ? "Miễn phí" : "Free") : (lang === "vi" ? "Trả phí" : "Paid")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-2.5">
        {visible.map((subject) => {
          const override = overrides.get(subject.id)
          const isPaid = getPaidProductId(subject.code) !== null
          const isVisible = override?.visible ?? true
          const isEditing = editingId === subject.id && draft
          return (
            <article key={subject.id} className={cn("rounded-[15px] border-2 bg-white p-3.5 shadow-[0_3px_0_#DCDCDC] sm:p-4 dark:bg-slate-900 dark:shadow-none", isVisible ? "border-[#E5E5E5] dark:border-white/10" : "border-slate-200 opacity-75 dark:border-white/5")}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#E8F7FE] px-2 py-0.5 text-[11px] font-black text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">{subject.code}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", isPaid ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300")}>
                      {isPaid ? (lang === "vi" ? "Trả phí" : "Paid") : (lang === "vi" ? "Miễn phí" : "Free")}
                    </span>
                    {!isVisible ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {lang === "vi" ? "Đang ẩn" : "Hidden"}
                      </span>
                    ) : null}
                    {override ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                        {lang === "vi" ? "Đã tùy chỉnh" : "Customized"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-extrabold text-[#100F3E] dark:text-white">
                    {(lang === "vi" ? override?.nameVi : override?.nameEn) || subject.name[lang]}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-400">
                    {subject.exams.length} {lang === "vi" ? "đề" : "exams"}
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={savingId === subject.id}
                    onChange={(event) => void toggleVisible(subject, event.target.checked)}
                    className="h-5 w-5 accent-[#1CB0F6]"
                    aria-label={lang === "vi" ? `Hiển thị môn ${subject.code}` : `Show ${subject.code}`}
                  />
                  {lang === "vi" ? "Hiện" : "Show"}
                </label>
                <button
                  type="button"
                  onClick={() => (isEditing ? (setEditingId(null), setDraft(null)) : openEditor(subject))}
                  className="lp-btn lp-btn--secondary lp-btn--sm shrink-0"
                >
                  {isEditing ? (lang === "vi" ? "Đóng" : "Close") : (lang === "vi" ? "Sửa" : "Edit")}
                </button>
              </div>

              {isEditing && draft ? (
                <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-white/10">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === "vi" ? "Tên môn (VI)" : "Name (VI)"}
                    <input value={draft.nameVi} onChange={(e) => setDraft({ ...draft, nameVi: e.target.value })} placeholder={subject.name.vi} className={cn(inputClassName, "mt-1")} maxLength={200} />
                  </label>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === "vi" ? "Tên môn (EN)" : "Name (EN)"}
                    <input value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} placeholder={subject.name.en} className={cn(inputClassName, "mt-1")} maxLength={200} />
                  </label>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === "vi" ? "Tiêu đề đề thi (VI)" : "Exam title (VI)"}
                    <input value={draft.titleVi} onChange={(e) => setDraft({ ...draft, titleVi: e.target.value })} placeholder={subject.exams[0]?.title.vi ?? ""} className={cn(inputClassName, "mt-1")} maxLength={200} />
                  </label>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === "vi" ? "Tiêu đề đề thi (EN)" : "Exam title (EN)"}
                    <input value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} placeholder={subject.exams[0]?.title.en ?? ""} className={cn(inputClassName, "mt-1")} maxLength={200} />
                  </label>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 sm:col-span-2">
                    {lang === "vi" ? "Ghi chú (VI)" : "Note (VI)"}
                    <textarea value={draft.noteVi} onChange={(e) => setDraft({ ...draft, noteVi: e.target.value })} placeholder={subject.exams[0]?.description.vi ?? ""} rows={2} className={cn(inputClassName, "mt-1 h-auto resize-y py-2.5")} maxLength={2000} />
                  </label>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 sm:col-span-2">
                    {lang === "vi" ? "Ghi chú (EN)" : "Note (EN)"}
                    <textarea value={draft.noteEn} onChange={(e) => setDraft({ ...draft, noteEn: e.target.value })} placeholder={subject.exams[0]?.description.en ?? ""} rows={2} className={cn(inputClassName, "mt-1 h-auto resize-y py-2.5")} maxLength={2000} />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button type="button" onClick={() => void save(subject)} disabled={savingId === subject.id} className="lp-btn lp-btn--primary lp-btn--sm">
                      {savingId === subject.id ? (lang === "vi" ? "Đang lưu…" : "Saving…") : (lang === "vi" ? "Lưu" : "Save")}
                    </button>
                    <button type="button" onClick={() => void resetToDefault(subject)} disabled={savingId === subject.id} className="lp-btn lp-btn--secondary lp-btn--sm">
                      {lang === "vi" ? "Khôi phục gốc" : "Reset to default"}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
        {!visible.length ? (
          <Card variant="dashed" className="py-14 text-center">
            <p className="text-sm font-bold text-slate-500">{lang === "vi" ? "Không có môn nào khớp tìm kiếm." : "No subjects match."}</p>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
