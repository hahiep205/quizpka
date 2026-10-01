/**
 * Helper MỘT LẦN: mở trình duyệt THẬT để BẠN tự đăng nhập Google bằng tay,
 * rồi lưu phiên đăng nhập (storage state) ra thư mục TEMP của OS.
 *
 * READ-ONLY đối với repo: không sửa code, file lưu ngoài repo.
 * Cách dùng:
 *   node e2e/dang-nhap-thu-cong.mjs
 * Sau khi dashboard hiện đủ các card đề, script tự lưu file và in đường dẫn.
 * Rồi chạy quét E2E kèm phiên đó:
 *   $env:QUIZPKA_E2E_STATE="<đường dẫn in ra>"; npx playwright test --config e2e/playwright.config.ts
 */
import { chromium } from "playwright"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const out =
  process.argv[2] ?? path.join(os.tmpdir(), "quizpka-dashboard-e2e", "storage-state.json")
fs.mkdirSync(path.dirname(out), { recursive: true })

// Dùng Chrome THẬT trên máy (Google từ chối trình duyệt automation).
const browser = await chromium.launch({ headless: false, channel: "chrome" })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
console.log("[dang-nhap] Trinh duyet da mo. Hay DANG NHAP GOOGLE trong cua so nay (toi da 10 phut).")
console.log("[dang-nhap] Dang cho dashboard hien du card de...")
await page.goto("http://localhost:5173/dashboard")
try {
  await page.locator("#dashboard-documents article").first().waitFor({ timeout: 600000 })
  await context.storageState({ path: out })
  console.log(`[dang-nhap] OK. Da luu phien dang nhap: ${out}`)
} catch {
  console.log("[dang-nhap] Het 10 phut ma chua thay dashboard. Chua luu file.")
}
await browser.close()
