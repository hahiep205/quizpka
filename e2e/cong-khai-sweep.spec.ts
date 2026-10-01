/**
 * E2E SWEEP CÔNG KHAI: bấm từng môn THẬT trên trang chủ http://localhost:5173/
 * (DocumentsPage #docs + ToeicSection #features) mà KHÔNG cần đăng nhập.
 *
 * CAM KẾT READ-ONLY, TUYỆT ĐỐI KHÔNG CHỈNH SỬA CODE/DỮ LIỆU:
 * 1. File MỚI trong e2e/, không sửa file nguồn nào.
 * 2. Mỗi test chạy ẩn danh và:
 *    - CHẶN toàn bộ request không phải GET/HEAD/OPTIONS ở tầng mạng.
 *    - Gặp modal mời đăng nhập ("Đăng nhập để học trọn vẹn") thì chỉ bấm
 *      "Bỏ qua" để đi tiếp luồng khách — KHÔNG bấm "Đăng nhập ngay".
 *    - Gặp dialog mua ("Thông tin môn học") thì xác minh rồi bấm "Hủy" —
 *      KHÔNG tick điều khoản, KHÔNG bấm nút mua.
 *    - Vào phòng thi khách thì dừng ở "câu hỏi đã hiện" — KHÔNG chọn đáp án,
 *      KHÔNG bấm "Nộp bài".
 * 3. Môn nào dialog lạ / bank không tải / lỗi JS sẽ FAIL với tên test chứa
 *    sẵn mã môn + mã đề.
 */
import { test, expect, type Page } from "@playwright/test"
import { examCatalog } from "../src/data/subjects"

const targets = examCatalog.filter((exam) => !exam.hideFromCatalog)

const KNOWN_PICKER_TITLES = [
  "Chọn chương",
  "Chọn đề tham khảo",
  "Chọn bộ đề ôn tập",
  "Chọn phạm vi luyện",
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

/** Đóng popup chen ngang (thông báo bảo trì...) — chỉ đóng, không tương tác sâu. */
async function dismissInterstitialPopup(page: Page, notes: string[]) {
  // Announcement hiện sau ~1s nên đợi một nhịp rồi mới kiểm tra.
  await page.waitForTimeout(2000)
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

test.describe("public sweep E2E (READ-ONLY, không đăng nhập)", () => {
  test("coverage: trang chủ hiển thị đủ số đề công khai", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const docs = page.locator("#docs")
    const features = page.locator("#features")
    await expect(docs.locator("article").first()).toBeVisible({ timeout: 30000 })
    await expect(features.locator("article").first()).toBeVisible({ timeout: 30000 })
    const docsCount = await docs.locator("article").count()
    const toeicCount = await features.locator("article").count()
    const docsExpected = targets.filter((e) => e.subjectId !== "toeic").length
    const toeicExpected = targets.filter((e) => e.subjectId === "toeic").length
    expect(docsCount, `#docs hiện ${docsCount}, catalog khai ${docsExpected}`).toBe(docsExpected)
    expect(toeicCount, `#features hiện ${toeicCount}, catalog khai ${toeicExpected}`).toBe(
      toeicExpected,
    )
  })

  for (const exam of targets) {
    test(`khách bấm đề ${exam.subjectCode} / ${exam.id}`, async ({ page }) => {
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

      // 1. Mở trang chủ, tìm đúng card của đề.
      await page.goto("/", { waitUntil: "domcontentloaded" })
      const section = page.locator(exam.subjectId === "toeic" ? "#features" : "#docs")
      await expect(section.locator("article").first()).toBeVisible({ timeout: 30000 })
      await dismissInterstitialPopup(page, notes)
      const card = section
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: exam.title.vi, exact: true }) })
        .first()
      await expect(
        card,
        `không thấy card "${exam.title.vi}" (${exam.subjectCode}) ở trang chủ`,
      ).toBeVisible({ timeout: 15000 })

      // 2. Bấm CTA → modal mời đăng nhập → chỉ bấm "Bỏ qua" (luồng khách).
      await card.getByRole("button").first().click()
      const dialogs = page.getByRole("dialog")
      await expect(
        dialogs.first(),
        `bấm CTA của ${exam.subjectCode} nhưng không mở dialog nào`,
      ).toBeVisible({ timeout: 20000 })
      const firstTitle = (
        await dialogs
          .first()
          .getByRole("heading")
          .first()
          .innerText()
          .catch(() => "")
      ).trim()
      if (firstTitle.includes("Đăng nhập để học trọn vẹn")) {
        notes.push("nudge: hiện modal mời đăng nhập")
        await dialogs
          .first()
          .getByRole("button", { name: "Bỏ qua", exact: true })
          .click()
        await expect(
          dialogs.first(),
          `${exam.subjectCode}: bấm "Bỏ qua" nhưng không sang bước tiếp theo`,
        ).toBeVisible({ timeout: 20000 })
      } else {
        failures.push(`sau CTA mong đợi nudge đăng nhập, thực tế: "${firstTitle}"`)
      }
      // 3a. Cổng mua (môn trả phí, đi ẩn danh): xác minh rồi Hủy, KHÔNG mua.
      // Dialog mua đặt chữ "Thông tin môn học" trong span sr-only (heading đầu
      // tiên NHÌN THẤY là tên môn), nên nhận diện bằng text marker thay vì heading.
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

      // 3b. Picker các loại rồi vào phòng thi khách.
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
        `${exam.subjectCode}: dialog lạ sau nudge: "${title}"`,
      ).toBe(true)
      notes.push(`picker: ${title}`)
      const picker = dialogs.first()
      await expect(
        picker.getByText(/\d+\s(câu hỏi|ảnh)/).first(),
        `${exam.subjectCode}: picker không liệt kê option nào`,
      ).toBeVisible({ timeout: 15000 })
      await picker.getByRole("button", { name: "Bắt đầu", exact: true }).first().click()

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
