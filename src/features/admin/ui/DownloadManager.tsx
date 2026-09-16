import { useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { examCatalog, subjects, type Subject } from "@/data/subjects"
import { getPaidProductId } from "@/lib/purchases"
import { cn } from "@/lib/utils"
import { refreshSubjectOverrides, useSubjectOverrides } from "@/hooks/useSubjectOverrides"
import { saveSubjectOverride } from "@/features/admin/api/subjectOverrides"
import { isSubjectDownloadable, isSubjectVisible } from "@/features/admin/lib/subjectDisplay"

type Lang = "vi" | "en"

/** Free subjects that can appear on /dashboard/downloads (TOEIC excluded, like the page itself). */
const downloadableSubjects = subjects.filter(
  (subject) =>
    subject.id !== "toeic" &&
    getPaidProductId(subject.code) === null &&
    examCatalog.some((exam) => exam.subjectId === subject.id && !exam.hideFromCatalog),
)

export function DownloadManager({ lang }: { lang: Lang }) {
  const overrides = useSubjectOverrides()
  const [query, setQuery] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return downloadableSubjects.filter((subject) => {
      if (!normalized) return true
      return `${subject.code} ${subject.name.vi} ${subject.name.en}`.toLowerCase().includes(normalized)
    })
  }, [query])

  const enabledCount = downloadableSubjects.filter(
    (subject) => isSubjectDownloadable(subject.id, overrides) && isSubjectVisible(subject.id, overrides),
  ).length

  const saveFlags = async (subject: Subject, patch: { downloadable?: boolean; visible?: boolean }) => {
    if (savingId) return
    setSavingId(subject.id)
    setResult(null)
    try {
      const current = overrides.get(subject.id)
      const downloadable = patch.downloadable ?? current?.downloadable ?? true
      const visibleFlag = patch.visible ?? current?.visible ?? true
      await saveSubjectOverride({
        subjectId: subject.id,
        nameVi: current?.nameVi ?? null,
        nameEn: current?.nameEn ?? null,
        titleVi: current?.titleVi ?? null,
        titleEn: current?.titleEn ?? null,
        noteVi: current?.noteVi ?? null,
        noteEn: current?.noteEn ?? null,
        visible: visibleFlag,
        downloadable,
      })
      await refreshSubjectOverrides()
      const stateLabel = !downloadable
        ? lang === "vi" ? "đã tắt tải" : "downloads disabled"
        : !visibleFlag
          ? lang === "vi" ? "đang ẩn" : "hidden"
          : lang === "vi" ? "đang cho tải" : "downloadable"
      setResult({ ok: true, message: lang === "vi" ? `Môn ${subject.code} ${stateLabel}. Trang tải về sẽ đồng bộ ngay.` : `${subject.code} is now ${stateLabel}. Downloads page will sync.` })
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : lang === "vi" ? "Không thể lưu." : "Unable to save." })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section id="admin-downloads" className="scroll-mt-24 space-y-4 sm:space-y-5">
      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
            <Download className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#100F3E] dark:text-white">
              {lang === "vi" ? `${enabledCount}/${downloadableSubjects.length} môn đang cho tải` : `${enabledCount}/${downloadableSubjects.length} subjects downloadable`}
            </p>
            <p className="text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              {lang === "vi"
                ? "Bật/tắt quyền tải PDF và ẩn/hiện từng bộ tài liệu miễn phí. Thay đổi đồng bộ ngay tới trang /dashboard/downloads. Môn trả phí không nằm trong danh sách này."
                : "Toggle PDF download permission and visibility per free subject. Changes sync immediately to /dashboard/downloads. Paid subjects are not listed here."}
            </p>
          </div>
        </div>
        {result ? (
          <p role={result.ok ? "status" : "alert"} className={cn("rounded-xl px-3 py-2 text-sm font-bold", result.ok ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>
            {result.message}
          </p>
        ) : null}
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "vi" ? "Tìm mã / tên môn…" : "Search code / name…"}
            className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white"
          />
        </label>
      </Card>

      <div className="space-y-2.5">
        {visible.map((subject) => {
          const downloadable = isSubjectDownloadable(subject.id, overrides)
          const shown = isSubjectVisible(subject.id, overrides)
          const examCount = examCatalog.filter((exam) => exam.subjectId === subject.id && !exam.hideFromCatalog).length
          const busy = savingId === subject.id
          return (
            <article key={subject.id} className={cn("rounded-[15px] border-2 bg-white p-3.5 shadow-[0_3px_0_#DCDCDC] sm:p-4 dark:bg-slate-900 dark:shadow-none", downloadable && shown ? "border-[#E5E5E5] dark:border-white/10" : "border-slate-200 opacity-75 dark:border-white/5")}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#E8F7FE] px-2 py-0.5 text-[11px] font-black text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300">{subject.code}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {lang === "vi" ? "Miễn phí" : "Free"}
                    </span>
                    {!downloadable ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-300">
                        {lang === "vi" ? "Tắt tải" : "Downloads off"}
                      </span>
                    ) : null}
                    {!shown ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {lang === "vi" ? "Đang ẩn" : "Hidden"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-extrabold text-[#100F3E] dark:text-white">
                    {subject.name[lang]}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-400">
                    {examCount} {lang === "vi" ? "bộ tài liệu" : "sets"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={downloadable}
                      disabled={busy}
                      onChange={(event) => void saveFlags(subject, { downloadable: event.target.checked })}
                      className="h-5 w-5 accent-[#1CB0F6]"
                      aria-label={lang === "vi" ? `Cho phép tải môn ${subject.code}` : `Allow downloads for ${subject.code}`}
                    />
                    {lang === "vi" ? "Cho tải" : "Allow"}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={shown}
                      disabled={busy}
                      onChange={(event) => void saveFlags(subject, { visible: event.target.checked })}
                      className="h-5 w-5 accent-[#1CB0F6]"
                      aria-label={lang === "vi" ? `Hiển thị môn ${subject.code}` : `Show ${subject.code}`}
                    />
                    {lang === "vi" ? "Hiện" : "Show"}
                  </label>
                </div>
              </div>
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
