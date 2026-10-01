/**
 * E2E SWEEP: bấm từng môn THẬT trên http://localhost:5173/dashboard.
 *
 * CAM KẾT READ-ONLY, TUYỆT ĐỐI KHÔNG CHỈNH SỬA CODE/DỮ LIỆU:
 * 1. File này là file MỚI trong thư mục e2e/, không sửa bất kỳ file nguồn nào.
 * 2. Mỗi test chạy trên browser context TRẮNG (chưa đăng nhập) và:
 *    - CHẶN toàn bộ request HTTP không phải GET/HEAD/OPTIONS (route.abort),
 *      tức mọi ghi lên Supabase (activity, history, purchases) đều bị chặn
 *      ngay tại tầng mạng. Chỉ cho phép ĐỌC (tải trang, bank JSON, ảnh đề).
 *    - KHÔNG tick đồng ý điều khoản, KHÔNG bấm nút mua/thanh toán,
 *      KHÔNG chọn đáp án, KHÔNG bấm "Nộp bài". Dừng lại ở màn hình
 *      "câu hỏi đã hiện ra" rồi bỏ context (không submit gì cả).
 *    - Popup chen ngang (nếu có) chỉ được ĐÓNG, không tương tác sâu.
 * 3. Môn nào có dialog lạ / bank không tải được / lỗi JS (pageerror) sẽ FAIL
 *    với tên test chứa sẵn mã môn + mã đề để biết ngay "môn nào lỗi".
 */
import { test, expect, type Page } from "@playwright/test"
// subjects.ts là module thuần (không import gì khác) nên import trực tiếp
// bằng đường dẫn tương đối, không cần alias @.
import { examCatalog } from "../src/data/subjects"

// Toàn bộ đề USER NHÌN THẤY trên dashboard = đề không bị hideFromCatalog
// (đúng điều kiện lọc của DashboardPage).
const targets = examCatalog.filter((exam) => !exam.hideFromCatalog)

const KNOWN_PICKER_TITLES = [
  "Chọn chương", // HcmChapterPickerModal
  "Chọn đề tham khảo", // TadvPickerModal (TADV01 miễn phí)
  "Chọn bộ đề ôn tập", // DsaiPickerModal (DSAI101 / TADV02)
  "Chọn phạm vi luyện", // ToeicScopePickerModal
]

async function blockAllWrites(page: Page, counter: { blocked: number }) {
  await page.route("**/*", (route) => {
    const method = route.request().method()
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return route.continue()
    }
    counter.blocked += 1
    return route.abort()
  })
}

/** Đóng popup chen ngang (nếu có) — chỉ đóng, không tương tác sâu. */
async function dismissInterstitialPopup(page: Page, notes: string[]) {
  const pre = page.getByRole("dialog")
  if (await pre.first().isVisible().catch(() => false)) {
    notes.push("đóng popup chen ngang trước khi bấm CTA")
    const closer = pre
      .first()
      .getByRole("button", { name: /Đóng|Hủy|Để sau|Đã hiểu/ })
      .first()
    if (await closer.isVisible().catch(() => false)) {
      await closer.click()
    } else {
      await page.keyboard.press("Escape")
    }
    await expect(pre.first()).toBeHidden({ timeout: 10000 })
  }
}

test.describe("dashboard sweep E2E (READ-ONLY, không sửa code)", () => {
  test("coverage: dashboard hiển thị đủ số đề như catalog", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    const section = page.locator("#dashboard-documents")
    await expect(section.locator("article").first()).toBeVisible({ timeout: 30000 })
    const allCount = await section.locator("article").count()
    await page.getByRole("button", { name: "TOEIC" }).first().click()
    await page.waitForTimeout(800)
    const toeicCount = await section.locator("article").count()
    const nonToeicExpected = targets.filter((e) => e.subjectId !== "toeic").length
    const toeicExpected = targets.filter((e) => e.subjectId === "toeic").length
    expect(
      allCount,
      `filter mặc định hiện ${allCount} đề, catalog khai ${nonToeicExpected} đề phi-TOEIC`,
    ).toBe(nonToeicExpected)
    expect(toeicCount, `filter TOEIC hiện ${toeicCount} đề, catalog khai ${toeicExpected}`).toBe(
      toeicExpected,
    )
  })

  for (const exam of targets) {
    test(`bấm đề ${exam.subjectCode} / ${exam.id}`, async ({ page }) => {
      const notes: string[] = []
      const failures: string[] = []
      const counter = { blocked: 0 }
      page.on("pageerror", (err) => {
        failures.push(`pageerror: ${err instanceof Error ? err.message : String(err)}`)
      })
      page.on("dialog", async (d) => {
        failures.push(`native dialog chặn luồng: ${d.message()}`)
        await d.dismiss().catch(() => {})
      })
      await blockAllWrites(page, counter)

      // 1. Mở dashboard, tìm đúng card của đề (theo tiêu đề + mã môn).
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
      const section = page.locator("#dashboard-documents")
      await expect(section.locator("article").first()).toBeVisible({ timeout: 30000 })
      if (exam.subjectId === "toeic") {
        await page.getByRole("button", { name: "TOEIC" }).first().click()
        await page.waitForTimeout(800)
      }
      await dismissInterstitialPopup(page, notes)
      const card = section
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: exam.title.vi, exact: true }) })
        .first()
      await expect(
        card,
        `không thấy card "${exam.title.vi}" (${exam.subjectCode}) trên dashboard`,
      ).toBeVisible({ timeout: 15000 })
      await expect(card.getByText(exam.subjectCode, { exact: true }).first()).toBeVisible()

      // 2. Bấm CTA của card — luồng thật như user.
      await card.getByRole("button").first().click()
      const dialogs = page.getByRole("dialog")
      await expect(
        dialogs.first(),
        `bấm CTA của ${exam.subjectCode} nhưng không mở dialog nào`,
      ).toBeVisible({ timeout: 20000 })
      // 3a. Cổng mua: nhận diện bằng text marker "Thông tin môn học"
      // (heading đầu tiên NHÌN THẤY là tên môn, chữ này nằm ở span sr-only).
      if ((await dialogs.first().getByText("Thông tin môn học").count()) > 0) {
        notes.push("paid-gate: hiện dialog mua")
        await expect(
          dialogs.first().getByRole("button", { name: /VND/ }).first(),
          `${exam.subjectCode}: dialog mua thiếu nút giá`,
        ).toBeVisible()
        await dialogs.first().getByRole("button", { name: "Hủy" }).first().click()
        await expect(dialogs.first()).toBeHidden({ timeout: 10000 })
        notes.push(`đã chặn ${counter.blocked} request ghi ở tầng mạng`)
        console.log(`[${exam.subjectCode}/${exam.id}] ${notes.join(" | ")}`)
        expect(failures).toEqual([])
        return
      }

      // 3b. Picker các loại (chương / TADV / DSAI / TOEIC scope).
      const title = (
        await dialogs
          .first()
          .getByRole("heading")
          .first()
          .innerText()
          .catch(() => "")
      ).trim()
      expect(
        KNOWN_PICKER_TITLES.some((t) => title.includes(t)),
        `${exam.subjectCode}: dialog lạ sau CTA: "${title}"`,
      ).toBe(true)
      notes.push(`picker: ${title}`)
      const picker = dialogs.first()
      await expect(
        picker.getByText(/\d+\s(câu hỏi|ảnh)/).first(),
        `${exam.subjectCode}: picker không liệt kê option nào`,
      ).toBeVisible({ timeout: 15000 })
      // Giữ nguyên lựa chọn mặc định, bấm "Bắt đầu" để sang bước kế tiếp.
      await picker.getByRole("button", { name: "Bắt đầu", exact: true }).first().click()

      // 4. Sau picker: hoặc viewer tài liệu ảnh, hoặc modal cấu hình quiz.
      const setupHeading = page
        .getByRole("dialog")
        .getByRole("heading", { name: "Cấu hình Quiz" })
      const viewerLoading = page.getByText(/Đang tải (ảnh|tài liệu)/)
      await expect(
        setupHeading.or(viewerLoading).first(),
        `${exam.subjectCode}: sau picker không sang setup quiz cũng không sang viewer`,
      ).toBeVisible({ timeout: 20000 })

      if (await viewerLoading.first().isVisible().catch(() => false)) {
        notes.push("doc-flow: viewer tài liệu mở được")
        await page.keyboard.press("Escape")
        await expect(page.getByRole("dialog").first()).toBeHidden({ timeout: 10000 })
        console.log(`[${exam.subjectCode}/${exam.id}] ${notes.join(" | ")}`)
        expect(failures).toEqual([])
        return
      }

      // 5. Modal cấu hình quiz hiện ra → bấm "Bắt đầu" để vào phòng thi THẬT
      //    (bank local/remote được tải bằng GET — vẫn là đọc).
      const setupDlg = page.getByRole("dialog").filter({ hasText: "Cấu hình Quiz" })
      await setupDlg
        .getByRole("button", { name: "Bắt đầu", exact: true })
        .first()
        .click()
      await page.waitForURL(/\/practice/, { timeout: 30000 })
      const submitBtn = page.getByRole("button", { name: "Nộp bài" })
      const loadError = page.getByText("Không tải được bộ câu hỏi.")
      await expect(
        submitBtn.or(loadError).first(),
        `${exam.subjectCode}: vào practice nhưng câu hỏi không hiện`,
      ).toBeVisible({ timeout: 120000 })
      if (await loadError.isVisible().catch(() => false)) {
        failures.push('practice hiện "Không tải được bộ câu hỏi." (bank lỗi)')
      } else {
        notes.push("practice: bank tải OK, câu hỏi đã render (KHÔNG chọn đáp án, KHÔNG nộp bài)")
      }
      notes.push(`đã chặn ${counter.blocked} request ghi ở tầng mạng`)
      console.log(`[${exam.subjectCode}/${exam.id}] ${notes.join(" | ")}`)
      expect(failures).toEqual([])
    })
  }
})
