/// <reference types="node" />
/**
 * DASHBOARD SWEEP TEST — CHỈ ĐỌC (READ-ONLY).
 *
 * Mục đích: quét qua TẤT CẢ môn học xuất hiện ở http://localhost:5173/dashboard
 * (view home + purchased + downloads + toeic) và báo môn nào đang lỗi.
 *
 * CAM KẾT READ-ONLY, TUYỆT ĐỐI KHÔNG CHỈNH SỬA CODE/DỮ LIỆU:
 * - Chỉ import các module DỮ LIỆU THUẦN (subjects, subjectChapters, toeic,
 *   tadvExams, dsaiExams, tadvPaidExams) + fs để đọc file bank.
 * - KHÔNG import DashboardPage, hooks (useExamLaunch/useChapterPractice),
 *   supabase, storage, activityLog, practiceSession, purchases (kéo theo
 *   supabase client) hay bất kỳ API nào có thể ghi/navigate/gọi mạng.
 * - Chỉ dùng existsSync/readFileSync + hàm thuần. Không có writeFile,
 *   localStorage, sessionStorage, fetch, navigate trong file này.
 * - Logic "môn nào hiện trên dashboard" được sao chép đúng 1 dòng điều kiện
 *   của DashboardPage: `!exam.hideFromCatalog` (src/pages/DashboardPage.tsx).
 * - Logic "bấm vào môn thì mở picker nào" được mô phỏng lại bằng if thuần
 *   theo useExamLaunch + DashboardPage.handleDashboardStart, KHÔNG gọi hook.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { examCatalog, getSubjectById, subjects, type ExamPaper } from "@/data/subjects"
import {
  filterQuestionsBySubjectChapter,
  getChapterOptionsForSubject,
  hasChapterSupport,
} from "@/data/subjectChapters"
import { getToeicScopeOptions, getToeicScopeOption } from "@/data/toeic"
import { tadvExamOptions } from "@/data/tadvExams"
import { dsaiExamOptions } from "@/data/dsaiExams"
import { tadvPaidExamOptions } from "@/data/tadvPaidExams"

const here = dirname(fileURLToPath(import.meta.url))
const r2BanksRoot = resolve(here, "../../r2-banks/data")
// Đọc source purchases.ts DƯỚI DẠNG TEXT để biết môn nào trả phí,
// thay vì import nó (import sẽ khởi tạo supabase client + cần env).
const purchasesSource = readFileSync(resolve(here, "../lib/purchases.ts"), "utf8")
const paidCodes = new Set(
  [...purchasesSource.matchAll(/subjectCode === "([A-Z0-9]+)"/g)].map((m) => m[1]),
)

// ---- Helpers thuần túy (đọc, không ghi) ----
function bankPaths(exam: ExamPaper): string[] {
  return exam.questionBanks ?? []
}

function bankFile(bankPath: string): string {
  return join(r2BanksRoot, bankPath.replace(/^\/data\//, ""))
}

function countBankQuestions(bank: unknown): number {
  if (Array.isArray(bank)) {
    return bank.reduce((total, item) => {
      const questions = (item as { questions?: unknown })?.questions
      return total + (Array.isArray(questions) ? questions.length : 1)
    }, 0)
  }
  if (!bank || typeof bank !== "object") return 0
  const value = bank as Record<string, unknown>
  if (Array.isArray(value.questions)) return value.questions.length
  if (Array.isArray(value.parts)) {
    return value.parts.reduce(
      (total, part) => total + ((part as { questions?: unknown[] })?.questions?.length ?? 0),
      0,
    )
  }
  if (Array.isArray(value.groups)) {
    return value.groups.reduce(
      (total, group) => total + ((group as { questions?: unknown[] })?.questions?.length ?? 0),
      0,
    )
  }
  return 0
}

function flatQuestions(bank: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(bank)) {
    return bank.flatMap((item) => {
      const qs = (item as { questions?: Array<Record<string, unknown>> })?.questions
      return Array.isArray(qs) ? qs : [item as Record<string, unknown>]
    })
  }
  if (bank && typeof bank === "object") {
    const v = bank as Record<string, unknown>
    if (Array.isArray(v.questions)) return v.questions as Array<Record<string, unknown>>
    if (Array.isArray(v.parts)) {
      return (v.parts as Array<{ questions?: Array<Record<string, unknown>> }>).flatMap(
        (p) => p.questions ?? [],
      )
    }
    if (Array.isArray(v.groups)) {
      return (v.groups as Array<{ questions?: Array<Record<string, unknown>> }>).flatMap(
        (g) => g.questions ?? [],
      )
    }
  }
  return []
}

const OPTION_KEYS = new Set(["A", "B", "C", "D", "E", "F"])

/** Kiểm tra hình dạng 1 câu hỏi, trả về danh sách lỗi (rỗng = đạt). */
function checkQuestionShape(q: Record<string, unknown>, location: string): string[] {
  const errs: string[] = []
  if (typeof q.question !== "string" && typeof q.prompt !== "string") {
    errs.push(`${location}: thiếu text question/prompt`)
  }
  const answer = q.answer ?? q.correct_answer
  if (typeof answer !== "string") {
    errs.push(`${location}: thiếu answer/correct_answer`)
  }
  if (q.options !== undefined) {
    if (!q.options || typeof q.options !== "object" || Array.isArray(q.options)) {
      errs.push(`${location}.options phải là object`)
    } else {
      const keys = Object.keys(q.options)
      if (keys.some((k) => !OPTION_KEYS.has(k))) errs.push(`${location}.options có key lạ`)
      if (typeof answer === "string" && !(answer in (q.options as Record<string, unknown>))) {
        errs.push(`${location}: answer "${answer}" không nằm trong options`)
      }
    }
  }
  return errs
}

/**
 * Mô phỏng thuần luồng mở đề của dashboard (không gọi hook):
 * DashboardPage.handleDashboardStart + useExamLaunch.handleTryNow.
 */
function resolveLaunchRoute(subjectId: string): string {
  if (subjectId === "toeic") return "toeic-picker"
  if (subjectId === "tieng-anh-dau-vao") return "tadv-picker"
  if (subjectId === "khoa-hoc-du-lieu-va-tri-tue-nhan-tao") return "dsai-picker"
  if (subjectId === "tadv-traphi") return "tadv-paid-picker"
  return hasChapterSupport(subjectId) ? "chapter-picker" : "setup-modal"
}

type SweepResult = { errors: string[]; infos: string[]; route: string }

/** Quét 1 subject, chỉ đọc và trả về lỗi. Không throw, không ghi. */
function sweepSubject(subjectId: string): SweepResult {
  const errors: string[] = []
  const infos: string[] = []
  const subject = getSubjectById(subjectId)
  if (!subject) return { errors: [`getSubjectById("${subjectId}") trả về null`], infos, route: "?" }
  const route = resolveLaunchRoute(subject.id)

  // 1. Metadata cơ bản
  if (!subject.code) errors.push("thiếu subject.code")
  if (!subject.name?.vi || !subject.name?.en) errors.push("thiếu name vi/en")
  if (!subject.category?.vi || !subject.category?.en) errors.push("thiếu category vi/en")
  if (!subject.exams.length) errors.push("không có exam nào")

  for (const exam of subject.exams) {
    if (exam.hideFromCatalog) continue // ẩn khỏi dashboard -> bỏ qua
    if (!exam.title?.vi || !exam.title?.en) errors.push(`exam "${exam.id}": thiếu title vi/en`)
    if (!exam.description?.vi || !exam.description?.en) {
      errors.push(`exam "${exam.id}": thiếu description vi/en`)
    }
    if (exam.questionCount < 0) errors.push(`exam "${exam.id}": questionCount âm`)
    if (exam.durationMinutes < 0) errors.push(`exam "${exam.id}": durationMinutes âm`)
    if (exam.questionCount > 0 && exam.durationMinutes === 0) {
      errors.push(`exam "${exam.id}": có ${exam.questionCount} câu nhưng durationMinutes = 0`)
    }
    if (exam.questionCount === 0) {
      const hasDoc = (subject.chapters ?? []).some((c) => c.documentId)
      if (!hasDoc) errors.push(`exam "${exam.id}": questionCount = 0 nhưng không có document chapter`)
      else infos.push(`exam "${exam.id}": môn tài liệu ảnh (questionCount = 0)`)
    }
  }

  // 2. Chapter options
  const chapters = getChapterOptionsForSubject(subject.id)
  if (hasChapterSupport(subject.id) && (!chapters || !chapters.length)) {
    errors.push("hasChapterSupport=true nhưng getChapterOptionsForSubject rỗng")
  }
  const seenChapter = new Set<string>()
  for (const c of chapters ?? []) {
    if (seenChapter.has(c.id)) errors.push(`chapter "${c.id}": trùng id`)
    seenChapter.add(c.id)
    if (!c.label?.vi || !c.label?.en) errors.push(`chapter "${c.id}": thiếu label vi/en`)
    if (!(c.count > 0)) errors.push(`chapter "${c.id}": count phải > 0`)
    if (c.documentId && !(c.count >= 1)) {
      errors.push(`chapter "${c.id}": document chapter count bất thường`)
    }
  }

  // 3. Launch route: picker options phải tồn tại và hợp lệ
  if (route === "tadv-picker") {
    if (!tadvExamOptions.length) errors.push("tadv-picker nhưng tadvExamOptions rỗng")
    for (const opt of tadvExamOptions) {
      if (!opt.questionBanks?.length) errors.push(`tadv option "${opt.id}": thiếu questionBanks`)
    }
  }
  if (route === "dsai-picker") {
    if (!dsaiExamOptions.length) errors.push("dsai-picker nhưng dsaiExamOptions rỗng")
  }
  if (route === "tadv-paid-picker") {
    if (!tadvPaidExamOptions.length) errors.push("tadv-paid-picker nhưng tadvPaidExamOptions rỗng")
    const examIds = new Set(subject.exams.map((e) => e.id))
    for (const opt of tadvPaidExamOptions) {
      if (!examIds.has(opt.id)) errors.push(`tadv-paid option "${opt.id}" không khớp exam nào của môn`)
    }
  }
  if (subject.id === "toeic") {
    for (const exam of subject.exams.filter((e) => !e.hideFromCatalog)) {
      const scopes = getToeicScopeOptions(exam.id)
      if (!scopes.length) errors.push(`toeic exam "${exam.id}": không có scope nào`)
      if (!getToeicScopeOption("full", exam.id)) {
        errors.push(`toeic exam "${exam.id}": thiếu scope "full"`)
      }
    }
  }

  // 4. Question banks khai báo local: file phải tồn tại, parse được, đủ số lượng, đúng shape
  for (const exam of subject.exams.filter((e) => !e.hideFromCatalog)) {
    const paths = bankPaths(exam)
    if (!paths.length) {
      if (exam.questionCount > 0 && route !== "toeic-picker") {
        infos.push(`exam "${exam.id}": không có bank local (dùng bank remote/Supabase), bỏ qua check file`)
      }
      continue
    }
    const perBankQuestions: Array<Array<{ id: number | string; chapter?: string }>> = []
    for (const p of paths) {
      const f = bankFile(p)
      if (!existsSync(f)) {
        errors.push(`exam "${exam.id}": thiếu file bank ${p}`)
        continue
      }
      let bank: unknown
      try {
        bank = JSON.parse(readFileSync(f, "utf8"))
      } catch (e) {
        errors.push(`exam "${exam.id}": file ${p} JSON lỗi (${e instanceof Error ? e.message : String(e)})`)
        continue
      }
      const flat = flatQuestions(bank)
      perBankQuestions.push(
        flat.map((q) => ({ id: q.id as number | string, chapter: q.chapter as string | undefined })),
      )
      // shape check (giới hạn 5 lỗi/bank để log gọn)
      let shapeErrs = 0
      const ids = new Set<string>()
      let dup = false
      for (let i = 0; i < flat.length; i++) {
        const q = flat[i]
        for (const err of checkQuestionShape(q, `${p}[${i}]`)) {
          if (shapeErrs < 5) errors.push(`exam "${exam.id}": ${err}`)
          shapeErrs += 1
        }
        const key = String(q.id)
        if (ids.has(key)) dup = true
        ids.add(key)
      }
      if (dup) errors.push(`exam "${exam.id}": file ${p} trùng question id`)
      if (shapeErrs > 5) errors.push(`exam "${exam.id}": file ${p} còn ${shapeErrs - 5} lỗi shape khác...`)
    }
    if (perBankQuestions.length !== paths.length) continue // đã lỗi file ở trên
    const combined = perBankQuestions.flatMap((qs, bi) =>
      qs.map((q) => ({ ...q, id: `${bi}-${q.id}` })),
    )
    if (combined.length !== exam.questionCount) {
      errors.push(
        `exam "${exam.id}": bank thực tế ${combined.length} câu ≠ khai báo ${exam.questionCount} câu`,
      )
    }
    // đối chiếu count từng chapter (bỏ qua chapter tài liệu ảnh/pdf)
    for (const c of subject.chapters ?? []) {
      if (c.documentId) continue
      const actual = filterQuestionsBySubjectChapter(subject.id, combined, c.id).length
      if (actual !== c.count) {
        errors.push(`exam "${exam.id}": chapter "${c.id}" thực tế ${actual} ≠ khai báo ${c.count}`)
      }
    }
  }

  // 5. TOEIC scope files (đọc, không tải audio)
  if (subject.id === "toeic") {
    for (const exam of subject.exams.filter((e) => !e.hideFromCatalog)) {
      for (const scope of getToeicScopeOptions(exam.id)) {
        let total = 0
        for (const file of scope.files) {
          const f = bankFile(file)
          if (!existsSync(f)) {
            errors.push(`toeic "${exam.id}" scope "${scope.id}": thiếu file ${file}`)
            continue
          }
          try {
            total += countBankQuestions(JSON.parse(readFileSync(f, "utf8")))
          } catch (e) {
            errors.push(
              `toeic "${exam.id}" scope "${scope.id}": file ${file} lỗi (${e instanceof Error ? e.message : String(e)})`,
            )
          }
        }
        if (total !== scope.count) {
          errors.push(`toeic "${exam.id}" scope "${scope.id}": thực tế ${total} ≠ khai báo ${scope.count}`)
        }
      }
    }
  }

  infos.push(`route=${route}; ${paidCodes.has(subject.code) ? "trả phí" : "miễn phí"}`)
  return { errors, infos, route }
}

// Danh sách môn HIỆN TRÊN DASHBOARD = có ≥1 exam không bị hideFromCatalog
// (đúng điều kiện lọc của DashboardPage).
const dashboardSubjects = subjects.filter((s) => s.exams.some((e) => !e.hideFromCatalog))
const dashboardExams = examCatalog.filter((e) => !e.hideFromCatalog)

describe("dashboard sweep (READ-ONLY, không sửa code)", () => {
  it("liệt kê đủ môn hiển thị trên dashboard", () => {
    console.log(`[dashboard-sweep] subjects trên dashboard: ${dashboardSubjects.length}`)
    console.log(`[dashboard-sweep] exams trên dashboard: ${dashboardExams.length}`)
    console.table(
      dashboardSubjects.map((s) => ({
        code: s.code,
        subjectId: s.id,
        exams: s.exams.filter((e) => !e.hideFromCatalog).length,
        route: resolveLaunchRoute(s.id),
        paid: paidCodes.has(s.code) ? "paid" : "free",
      })),
    )
    expect(dashboardSubjects.length).toBeGreaterThan(0)
    expect(dashboardExams.length).toBeGreaterThan(0)
  })

  it("không trùng id/code giữa các môn và các đề dashboard", () => {
    const dupes: string[] = []
    const seenS = new Set<string>()
    for (const s of subjects) {
      if (seenS.has(s.id)) dupes.push(`trùng subject.id ${s.id}`)
      seenS.add(s.id)
    }
    const seenC = new Set<string>()
    for (const s of subjects) {
      if (seenC.has(s.code)) dupes.push(`trùng subject.code ${s.code}`)
      seenC.add(s.code)
    }
    const seenE = new Set<string>()
    for (const e of examCatalog) {
      if (seenE.has(e.id)) dupes.push(`trùng exam.id ${e.id}`)
      seenE.add(e.id)
    }
    expect(dupes).toEqual([])
  })

  // Mỗi môn 1 test case riêng để nhìn phát biết "môn nào lỗi".
  for (const subject of dashboardSubjects) {
    it(`quét môn ${subject.code} (${subject.id})`, () => {
      const { errors, infos } = sweepSubject(subject.id)
      if (infos.length) console.log(`[${subject.code}] ${infos.join(" | ")}`)
      if (errors.length) {
        console.error(`[${subject.code}] LỖI (${errors.length}):\n- ${errors.join("\n- ")}`)
      } else {
        console.log(`[${subject.code}] OK`)
      }
      expect(errors, `Môn ${subject.code} (${subject.name.vi}) có ${errors.length} lỗi`).toEqual([])
    })
  }
})
