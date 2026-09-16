import { useEffect, useMemo, useState } from "react"
import { Download, History, RefreshCw, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { examCatalog, subjects, type Subject } from "@/data/subjects"
import { getPaidProductId } from "@/lib/purchases"
import { cn } from "@/lib/utils"
import { refreshSubjectOverrides, useSubjectOverrides } from "@/hooks/useSubjectOverrides"
import { saveSubjectOverride } from "@/features/admin/api/subjectOverrides"
import { fetchDownloadHistory } from "@/features/admin/api/adminActivity"
import type { ActivityEvent } from "@/features/activity/lib/activityLog"
import { isSubjectDownloadable, isSubjectVisible } from "@/features/admin/lib/subjectDisplay"

type Lang = "vi" | "en"

/** Free subjects that can appear on /dashboard/downloads (TOEIC excluded, like the page itself). */
const downloadableSubjects = subjects.filter(
  (subject) =>
    subject.id !== "toeic" &&
    getPaidProductId(subject.code) === null &&
    examCatalog.some((exam) => exam.subjectId === subject.id && !exam.hideFromCatalog),
)

const HISTORY_PAGE_SIZE = 20

function downloadMeta(event: ActivityEvent): { email: string; subjectCode: string; chapterLabel: string; questionCount: number | null } {
  const m = event.metadata as Record<string, unknown>
  const text = (value: unknown) => (typeof value === "string" && value ? value : "")
  const count = typeof m["questionCount"] === "number" ? (m["questionCount"] as number) : null
  return {
    email: text(m["email"]) || event.userId.slice(0, 8),
    subjectCode: text(m["subjectCode"]),
    chapterLabel: text(m["chapterLabel"]),
    questionCount: count,
  }
}

export function DownloadManager({ lang }: { lang: Lang }) {
  const overrides = useSubjectOverrides()
  const [query, setQuery] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [history, setHistory] = useState<ActivityEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyQuery, setHistoryQuery] = useState("")
  const [historyPage, setHistoryPage] = useState(0)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  useEffect(() => {
    let active = true
    setHistoryLoading(true)
    setHistoryError(null)
    void fetchDownloadHistory(200).then((res) => {
      if (!active) return
      if (!res.ok) setHistoryError(res.error)
      else setHistory(res.events)
      setHistoryLoading(false)
    })
    return () => { active = false }
  }, [historyRefresh])

  const filteredHistory = useMemo(() => {
    const normalized = historyQuery.trim().toLowerCase()
    if (!normalized) return history
    return history.filter((event) => {
      const meta = downloadMeta(event)
      return `${meta.email} ${meta.subjectCode} ${meta.chapterLabel} ${event.userId}`.toLowerCase().includes(normalized)
    })
  }, [history, historyQuery])

  const historyPageCount = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE))
  const safeHistoryPage = Math.min(historyPage, historyPageCount - 1)
  const pagedHistory = filteredHistory.slice(safeHistoryPage * HISTORY_PAGE_SIZE, safeHistoryPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE)

  const formatTime = (value: string) => {
    const t = Date.parse(value)
    if (!Number.isFinite(t)) return "—"
    return new Date(value).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")
  }

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

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
              <History className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#100F3E] dark:text-white">
                {lang === "vi" ? `Lịch sử tải về (${filteredHistory.length})` : `Download history (${filteredHistory.length})`}
              </p>
              <p className="text-xs font-semibold text-slate-400">
                {lang === "vi" ? "200 lượt tải mới nhất trên toàn hệ thống." : "Newest 200 downloads across the system."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setHistoryPage(0); setHistoryRefresh((v) => v + 1) }}
            disabled={historyLoading}
            className="lp-btn lp-btn--secondary lp-btn--sm shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", historyLoading && "animate-spin")} strokeWidth={2} />
            {lang === "vi" ? "Tải lại" : "Reload"}
          </button>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={historyQuery}
            onChange={(e) => { setHistoryQuery(e.target.value); setHistoryPage(0) }}
            placeholder={lang === "vi" ? "Tìm email / mã môn…" : "Search email / subject code…"}
            className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white"
          />
        </label>
        {historyError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">{historyError}</p>
        ) : null}
        {historyLoading ? (
          <p className="py-6 text-center text-sm font-bold text-slate-400">{lang === "vi" ? "Đang tải lịch sử…" : "Loading history…"}</p>
        ) : null}
        {!historyLoading && !historyError && !pagedHistory.length ? (
          <p className="py-6 text-center text-sm font-bold text-slate-400">{lang === "vi" ? "Chưa có lượt tải nào." : "No downloads yet."}</p>
        ) : null}
        {pagedHistory.length ? (
          <div className="overflow-x-auto rounded-[12px] border-2 border-[#E5E5E5] dark:border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:bg-white/5">
                  <th className="px-4 py-3">{lang === "vi" ? "User" : "User"}</th>
                  <th className="px-4 py-3">{lang === "vi" ? "Bộ tài liệu" : "Material"}</th>
                  <th className="px-4 py-3 text-right">{lang === "vi" ? "Số câu" : "Questions"}</th>
                  <th className="px-4 py-3">{lang === "vi" ? "Thời gian" : "Time"}</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.map((event) => {
                  const meta = downloadMeta(event)
                  return (
                    <tr key={event.id} className="border-t border-slate-100 transition-colors hover:bg-sky-50/60 dark:border-white/5 dark:hover:bg-white/5">
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate font-extrabold text-[#100F3E] dark:text-white" title={meta.email}>{meta.email}</p>
                        <p className="truncate text-xs font-semibold text-slate-400">{event.userId.slice(0, 8)}</p>
                      </td>
                      <td className="max-w-[320px] px-4 py-3">
                        <p className="truncate font-extrabold text-[#100F3E] dark:text-white">{meta.subjectCode || "—"}</p>
                        <p className="truncate text-xs font-semibold text-slate-400">{meta.chapterLabel}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#100F3E] dark:text-white">{meta.questionCount ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-400">{formatTime(event.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {filteredHistory.length > HISTORY_PAGE_SIZE ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-400">
              {lang === "vi"
                ? `Hiển thị ${safeHistoryPage * HISTORY_PAGE_SIZE + 1}–${Math.min(filteredHistory.length, safeHistoryPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE)} / ${filteredHistory.length}`
                : `Showing ${safeHistoryPage * HISTORY_PAGE_SIZE + 1}–${Math.min(filteredHistory.length, safeHistoryPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE)} / ${filteredHistory.length}`}
            </p>
            <div className="flex gap-2">
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safeHistoryPage === 0} onClick={() => setHistoryPage(safeHistoryPage - 1)}>← {lang === "vi" ? "Trước" : "Prev"}</button>
              <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safeHistoryPage >= historyPageCount - 1} onClick={() => setHistoryPage(safeHistoryPage + 1)}>{lang === "vi" ? "Sau" : "Next"} →</button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  )
}
