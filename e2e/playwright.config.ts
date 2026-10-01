/**
 * Playwright config RIÊNG cho đợt quét dashboard (không dính tới vite.config.ts).
 * - KHÔNG dùng webServer: dùng dev server sẵn có ở http://localhost:5173.
 * - Mọi output (report JSON, screenshot khi fail) ghi ra thư mục TEMP của OS,
 *   tuyệt đối không xả file vào repo.
 */
import { defineConfig } from "playwright/test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const tmpRoot = path.join(os.tmpdir(), "quizpka-dashboard-e2e")
// Chạy kèm đăng nhập: QUIZPKA_E2E_STATE=/đường/dẫn/storage-state.json
// (file do script e2e/dang-nhap-thu-cong.mjs tạo ra trong TEMP, không nằm trong repo).
// Không có file này => chạy ẩn danh (sẽ dừng ở màn hình đòi đăng nhập).
const stateFile = process.env.QUIZPKA_E2E_STATE ?? path.join(tmpRoot, "storage-state.json")

export default defineConfig({
  testDir: ".",
  testMatch: ["dashboard-sweep.spec.ts", "cong-khai-sweep.spec.ts"],
  workers: 3,
  // Mỗi đề có thể phải tải bank remote (TOEIC full 200 câu) nên cho dư thời gian.
  timeout: 300000,
  expect: { timeout: 20000 },
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(tmpRoot, "results.json") }],
  ],
  outputDir: path.join(tmpRoot, "artifacts"),
  use: {
    baseURL: "http://localhost:5173",
    ...(fs.existsSync(stateFile) ? { storageState: stateFile } : {}),
    headless: true,
    viewport: { width: 1366, height: 900 },
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
})
