# KẾ HOẠCH TỐI ƯU HÓA QUIZPKA (QuizQuik)

> **Ngày tạo**: 2026-08-28 — **Phạm vi**: Toàn bộ source `src/`, `scripts/`, cấu hình build, dữ liệu `public/data`
> **Mục tiêu**: Cải thiện hiệu năng render quiz, tổ chức code, giảm tải dữ liệu, tăng độ an toàn/bảo trì — **không thay đổi hành vi người dùng hiện tại**.

---

## 1. TỔNG QUAN PROJECT & HIỆN TRẠNG

| Mục | Giá trị |
|---|---|
| Stack | React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind CSS 4 + Vitest + Oxlint |
| Nguồn code | ~6.500 dòng TS/TSX trong 48 file (`src/` + `scripts/`) |
| Dữ liệu | ~92 MB / 296 file trong `public/data/` (JSON + MP3 + PNG/WebP), ~4.000 câu hỏi |
| Deploy | Vercel (vercel.json: build = validate data → typecheck → build) |
| Kiểm tra hiện tại | ✅ Typecheck pass · ✅ Oxlint pass · ✅ 30/30 test pass · ✅ build pass · ✅ validate:data pass |
| Bundle (dist) | index JS **130.86 kB** (gzip 33.6 kB) · react **182 kB** (57.3 kB gz) · PracticeGuestPage **57 kB** · CSS **87.5 kB** (15.4 kB gz) · 6 ảnh stamp ~**1.3 MB** |

**Điểm mạnh đã có**: phân tầng feature `features/quiz` rõ ràng, TS strict + `noUnusedLocals`, validation 2 lớp (runtime `toeicSchema/questionBankSchema` + script `validate-data.js`), lazy-load route/modal, `AbortController` khi fetch, test đi kèm logic, `manualChunks` tách react/icons, media băm tên.

---

## 2. KIẾN TRÚC HIỆN TẠI

```text
src/
  app/          layout: SiteHeader, SiteFooter, navigation (router thủ công history API)
  components/   QuizSession (608 dòng), QuizSetupModal, 6 modal khác, ui/ (card, dialog, input, label, badge)
  data/         subjects.ts (danh mục môn/đề), toeic.ts (scope TOEIC), tadvExams.ts, subjectChapters.ts
  features/quiz/ domain quiz: api, hooks, lib (schema/helpers/selectors), model, ui
  lib/          practiceSession (sessionStorage), useChapterPractice, useExamLaunch, utils
  pages/        DashboardPage (598 dòng), DocumentsPage, PracticeGuestPage, NotFoundPage
  security/     chống gian lận: detect devtools, block contextmenu/shortcut, overlay
  shared/       i18n.ts (540 dòng), icons, types
public/data/    ngân hàng câu hỏi + media tĩnh (TOEIC 3 đề x 7 phần, TADV 3 đề, 8 môn đại cương/chuyên ngành)
scripts/        validate-data.js (build time), sync-data.js (đồng bộ từ /data nguồn)
```

Router thủ công: `navigation.ts` dùng `history.pushState` + `PopStateEvent`; 3 route: `/`, `/dashboard`, `/practice4guest`.

---

## 3. PHÂN TÍCH VẤN ĐỀ (XẾP THEO MỨC ƯU TIÊN)

### P0 — HIỆU NĂNG RENDER (ảnh hưởng trải nghiệm trực tiếp, dễ đo)

**P0-1. `QuizSession.tsx` là component nguyên khối 608 dòng + tính toán O(n²) nhiều chỗ.**
- `partQuestions.map(...)` gọi `questions.findIndex((item) => item.id === question.id) + 1` **bên trong render** → với TOEIC Part 3 (39 câu) là 39×200 phép duyệt mỗi lần render; chuỗi này chạy lại **mỗi giây** do timer (xem P0-2). File: `src/components/QuizSession.tsx` (dòng `partQuestions.map`).
- `partQuestions = questions.filter(...)`, `partQuestionIds = new Set(...)`, `partStartIndices = questions.reduce(...)`, `currentPartStartIndex = questions.findIndex(...)`, `toeicGroups = (() => {...})()` — tất cả **tính lại mỗi render**, không `useMemo`. Với 200 câu full test, sidebar vẽ ~200 nút + nhóm.
- Sidebar render **toàn bộ 200 nút câu hỏi** mỗi lần `answers` đổi (chọn 1 đáp án) và mỗi giây timer đổi.

**P0-2. `useQuizTimer` re-render toàn component mỗi giây.**
- `setInterval` 1s → `setElapsedSeconds` → QuizSession re-render toàn bộ (cả thành phần không liên quan thời gian). File: `src/features/quiz/hooks/useQuizTimer.ts`.
- Ngoài ra `onTimeout()` được gọi **bên trong state updater** (`setSecondsLeft((remaining) => { ... onTimeout(); return 0 })`) — side effect trong updater là anti-pattern; StrictMode dev có thể gọi updater 2 lần → timeout gọi 2 lần / đặt lại interval nhầm.

**P0-3. Không memo component con ở danh sách câu hỏi.**
- `QuizQuestionBlock` không bọc `React.memo`; `onAnswer` tạo closure mới mỗi render → mọi thay đổi `answers` / `elapsedSeconds` render lại toàn bộ phần đang hiển thị. File: `src/features/quiz/ui/QuizQuestionBlock.tsx`.

**P0-4. Ảnh stamp kết quả nặng (~1.3 MB, 6 PNG ~200–228 kB mỗi ảnh).**
- `src/assets/{Perfect,Kha,Tam,Qua,Kem,Liet}.png` — nên chuyển WebP/AVIF (giảm ~70–80%) hoặc nén lại. File: `src/features/quiz/ui/ResultStamp.tsx`.

### P1 — KIẾN TRÚC & TỔ CHỨC MÃ

**P1-1. Trùng lặp logic modal ở 8 chỗ.**
- `QuizSetupModal`, `ToeicScopePickerModal`, `ToeicAnnouncementModal`, `CommunityChatModal`, `HcmChapterPickerModal`, `TadvPickerModal`, `ContactModal`, `LoginModal` — mỗi file tự viết lại: pattern `visible/state` (open/closed + timeout 180ms), `body.overflow = hidden`, listener `Escape`. Nên tách: hook `useModalVisibility` + base `<Modal>` (overlay, lock scroll, escape, focus) dùng chung; `ui/dialog.tsx` đã có sẵn nhưng các modal không dùng nhất quán.

**P1-2. `QuizSession.tsx` cần tách nhỏ.**
- Tách: `QuestionNavSidebar`, `PartNavItems`, `ToeicGroupNav`, `QuizHeader/TimerBadge`, `QuestionPanel`, `ResultPanel`, `RetryProgress`. Giữ `QuizSession` chỉ điều phối state.

**P1-3. Dữ liệu TOEIC bị khai báo 2 nơi, nguy cơ lệch.**
- `src/data/subjects.ts` liệt kê `questionBanks` 7 file/đề (lặp 3 lần) **và** `src/data/toeic.ts` tạo `createPartFiles` cùng đường dẫn. Nếu đổi tên file 1 nơi, nơi kia lệch → chỉ 1 nguồn sự thật (dùng `PART_FILES_BY_TEST` cho `subjects.ts` hoặc sinh `questionBanks` từ `toeic.ts`).
- `questionCount`/`durationMinutes` (200/120) cũng lặp giữa `subjects.ts`, `toeic.ts`, `subjects.ts` fallback.

**P1-4. `pages/DashboardPage.tsx` (598 dòng) nguyên khối.**
- Chứa `DesktopSidebar`, `DashboardTopbar`, `MobileNav`, `HomeDashboard`, `LeaderboardView`, `EmptyView`, `SettingsView`, `PageHeading`, `SettingRow`, `TopbarButton` — nên tách folder `src/pages/dashboard/` (hoặc `src/features/dashboard/`).

**P1-5. Chuỗi tiếng Việt hardcode trong component (i18n thiếu/không nhất quán).**
- `DetailedAnalysisContent.tsx`: "Phân tích lựa chọn", "Từ vựng", "Điểm ngữ pháp", "Chiến lược", "Transcript", "Mô tả hình ảnh", "Đáp án".
- `QuizSession.tsx`: "Tiến bộ", "Lần 1", "Hiện tại", "Current", "Bạn đã đúng hết!", "Parts", "câu".
- `DashboardPage.tsx`, `LoginModal.tsx`… tương tự. Đưa hết vào `i18n.ts` theo key.

### P1 — DỮ LIỆU & TÀI NGUYÊN (tải trang / băng thông)

**P1-6. Audio TADV nặng (~50 MB tổng; file lớn nhất 6.95 MB).**
- `public/data/tadv/*.mp3` — nên re-encode 64–96 kbps mono (audio giọng đọc) để giảm 50–70% dung lượng mà chất lượng nghe vẫn ổn; giảm thời gian tải và chi phí băng thông Vercel.

**P1-7. Ảnh TADV reading là PNG ~0.3–0.4 MB/cái → chuyển WebP.**

**P1-8. JSON câu hỏi tải toàn bộ mỗi lần làm bài, không cache.**
- Không có service worker / cache layer; mỗi lần vào quiz fetch lại 1–7 JSON + chưa có `Cache-Control` rõ ràng. Gợi ý: `vercel.json` thêm header cache cho `/data/**` (immutable đã băm/ổn định) + cân nhắc `IndexedDB` cache nhẹ hoặc preload khi hover.

**P1-9. Bundle chunk PracticeGuestPage 57 kB chứa cả QuizSession** — có thể tách `QuizSession` + `ReviewPanel` + `DetailedAnalysisContent` thành chunk riêng nếu cần; trước mắt chấp nhận được.

### P2 — BẢO MỆNH (client-side, đúng bản chất "kiểm soát tương tác")

**P2-1. `security/detect.ts` dùng `debugger` + đo window size — dễ bypass, gây nhiễu.**
- `debugger` chạy mỗi 2s cùng interval; nếu devtools đóng thì thời gian ~0ms (ok) nhưng kỹ thuật này không đáng tin cho "chống lậu". Nên: (a) giới hạn scope chỉ khi bắt đầu quiz (hiện `scope: "global"` chặn cả trang chủ), (b) giữ F12 mở như bình luận hiện tại, (c) ưu tiên chặn copy/paste/switche tab trong lúc thi nếu yêu cầu khắt khe hơn.
- **P2-2. `blockAll.ts` chặn `contextmenu` toàn cục** — chặn cả chuột phải hợp lệ (copy văn bản, devtools). Nếu không cần, đặt `blockContextMenu: false`; nếu cần, giới hạn theo scope quiz.

### P2 — CHẤT LƯỢNG MÃ & LỖI TIỀM ẨN

**P2-3. `App.tsx` lặp mã**: 2 khối `try/catch` giống hệt khi hiện announcement; `getToday()` trùng lặp — tách helper `localDateKey()`.

**P2-4. `useRetryHistory` lưu lịch sử khi `setHistory` được gọi bởi `setRetryHistory` — nhỏ, tạm chấp nhận** (effect ghi sessionStorage thừa 1 lần khi mount).

**P2-5. `SiteHeader` scroll listener gọi `getBoundingClientRect` 3 phần tử mỗi scroll event** — nên throttle bằng `requestAnimationFrame`.

**P2-6. `mapBankItems` tính `acceptedAnswers` kể cả khi có options (chỉ dùng khi không có options)** — việc nhỏ, có thể tính lazy.

**P2-7. `parsePracticeSession`/`isQuizSetupValues` không kiểm tra `durationMinutes > 0`/`questionLimit` hợp lệ** — thêm ràng buộc để tránh payload hỏng (vd duration âm).

### P2 — TESTING & CI

**P2-8. Bổ sung test**: `useQuizTimer` (timeout 1 lần, reset), `useRetryHistory` edge cases, `shuffle` determinism/không đột biến, `parsePracticeSession` payload hỏng, `i18n` đầy đủ key 2 ngôn ngữ, `getQuizStats` 0 câu.
- **P2-9. Chưa có CI**: thêm GitHub Actions chạy `typecheck + lint + test + validate:data` mỗi push/PR (rẻ, chặn hỏng sớm).

---

## 4. KẾ HOẠCH TỐI ƯU CHI TIẾT THEO GIAI ĐOẠN

> Mỗi task: file ảnh hưởng, hành động, tiêu chí hoàn thành (DoD). Ưu tiên hiệu năng trước, đổi kiến trúc sau, và **luôn chạy `npm run typecheck && npm run lint && npm test && npm run build`** sau mỗi phase.

### Phase 0 — Baseline & an toàn (0.5 ngày)
1. Commit sạch trạng thái hiện tại (git status đang có file xóa chưa staged — public/data đã tái cấu trúc). `git add -A; git commit`.
2. Đo baseline: `npm run build` ghi lại bundle size; dùng DevTools Performance/Lighthouse ghi điểm trước khi đổi.
3. Tạo nhánh `codex/optimize-quiz-2026-08` (prefix `codex/`).

### Phase 1 — Hiệu năng render Quiz (P0, 1.5–2 ngày) — **ưu tiên cao nhất**
1. **Tách `QuizSession.tsx`** (~608 dòng) thành:
   - `src/features/quiz/ui/QuizSidebar.tsx` (nav câu hỏi / part / nhóm TOEIC)
   - `src/features/quiz/ui/QuizQuestionPanel.tsx` (header, part title, image/audio/passage, danh sách câu)
   - `src/features/quiz/ui/QuizResultPanel.tsx` (stats, stamp, retry, progress)
   - `src/features/quiz/ui/QuizHeader.tsx` (timer badge, progress bar)
   - `src/features/quiz/lib/quizGrouping.ts` — thuần hàm: `buildPartStartIndices`, `getPartQuestions`, `buildToeicGroups`, `getQuestionNumberMap` (trả `Map<id, number>` thay vì `findIndex` lặp) → **test unit cho các hàm này**.
2. **Xóa O(n²)**: thay `questions.findIndex(...)` trong loop bằng `questionNumberMap.get(question.id)` (dựng `useMemo` theo `questions`).
3. **Memo hóa danh sách hiển thị**: `partQuestions = useMemo(...)`; bọc `QuizQuestionBlock` bằng `React.memo` và `useCallback` cho `onAnswer` (hoặc dùng `useCallback((id, answer) => ...)`).
4. **Chia tách `answers` state**: giữ `Record<id, AnswerValue>` nhưng dùng `useReducer`/batching; mục tiêu mỗi lần chọn đáp án chỉ render lại đúng phần cần thiết (sidebar + câu hiện tại), không render lại toàn bộ.
5. **Sửa `useQuizTimer`**: bỏ side effect trong updater — dùng `useEffect` theo dõi `secondsLeft === 0` để gọi `onTimeout` 1 lần (ref chống lặp); tách đồng hồ ra `TimerBadge` con để component cha không re-render mỗi giây (`elapsedSeconds`/`secondsLeft` chỉ nằm trong component con; dùng `useSyncExternalStore`/callback khi cần).
6. **Kết quả đo**: render 60fps khi chọn đáp án, số re-render giảm, Lighthouse Performance ≥ 90 với máy chậm 4x; không đổi hành vi người dùng (kiểm tra thủ công TOEIC full test + TADV + môn đại cương).

### Phase 2 — Dữ liệu & tài nguyên (P1, 1–2 ngày)
1. **Nén audio TADV**: re-encode 15 file MP3 trong `public/data/tadv/` về 64–96 kbps mono (giữ tên file; nếu đổi tên phải cập nhật JSON). Mục tiêu giảm ≥50% (~50 MB → ≤25 MB). Xác minh `npm run validate:data` (kiểm tra media tồn tại) + nghe thử 1 file.
2. **Chuyển ảnh TADV reading PNG → WebP** (4+4+4 ảnh) — giữ tên/đường dẫn hoặc cập nhật JSON; mục tiêu giảm ~70%.
3. **Nén 6 ảnh stamp** (`src/assets/*.png` → WebP hoặc pngquant): 1.3 MB → ~350 kB.
4. **Cache dữ liệu tĩnh**: `vercel.json` thêm header `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` cho `/data/*` (JSON câu hỏi, audio, ảnh — đã ổn định) và `/assets/*` (băm immutable: `immutable`).
5. **Đo**: tổng dung lượng /data giảm, số request khi vào TOEIC full test giảm hoặc được cache (Network tab).

### Phase 3 — Kiến trúc & DRY (P1, 2–3 ngày)
1. **Tạo base modal + hook dùng chung**:
   - `src/components/ui/modal.tsx` cung cấp: overlay, lock scroll, Escape, focus (kế thừa logic từ `dialog.tsx`), animation open/close.
   - `src/hooks/useModalVisibility.ts` thay pattern `visible/state` lặp ở 8 modal.
   - Refactor lần lượt: `ToeicScopePickerModal` → `HcmChapterPickerModal` → `TadvPickerModal` → `QuizSetupModal` → `ToeicAnnouncementModal` → `CommunityChatModal` → `ContactModal` → `LoginModal` (mỗi modal 1 commit, chạy build + test).
2. **Nguồn sự thật TOEIC**: `subjects.ts` dùng `createPartFiles`/`PART_FILES_BY_TEST` từ `toeic.ts` (hoặc export helper `getToeicTestBanks(testId)`) thay vì hardcode 7 đường dẫn × 3 lần; thêm test so khớp `subjects.ts` ↔ `toeic.ts`.
3. **Tách `DashboardPage`** → `src/pages/dashboard/{DashboardPage,HomeView,LeaderboardView,HistoryView,SettingsView,Sidebar,Topbar,MobileNav}.tsx` (hoặc `features/dashboard/`). Không đổi UX.
4. **i18n hóa chuỗi hardcode** (P1-5): quét `vi`/`en` literal trong component, đưa vào `i18n.ts`; thêm test "mọi key đủ cả 2 ngôn ngữ".

### Phase 4 — Bảo mật & chất lượng mã (P2, 1–1.5 ngày)
1. **Security scoped**: thêm `SECURITY_CONFIG.scope = "quiz" | "global"`; chỉ chạy block contextmenu/shortcuts/devtools khi đang làm quiz (PracticeGuestPage) — giữ trải nghiệm trang chủ bình thường. Giữ F12 mở.
2. **Chặn copy/paste trong lúc thi** (nếu yêu cầu): thêm handler `copy/paste` + `visibilitychange` đếm số lần rời tab, cảnh báo khi vượt ngưỡng.
3. `App.tsx`: tách `localDateKey()`; bỏ khối try/catch trùng; `SiteHeader`: throttle scroll bằng rAF; `useQuizTimer` nhóm vào Phase 1.
4. `practiceSession.ts`: thêm validate `durationMinutes > 0`, `questionLimit >= 0`, `chapterId` hợp lệ.
5. **Dọn dead code nhỏ**: `subjectBanks.test.ts` kiểm tra file tồn tại (giữ), bỏ export thừa nếu có.

### Phase 5 — Test & CI (0.5–1 ngày)
1. Thêm test: `useQuizTimer` (timeout đúng 1 lần, reset, unlimited), `quizGrouping` (buildPartStartIndices, getQuestionNumberMap, toeicGroups), `parsePracticeSession` (payload thiếu/sai kiểu), `i18n` đầy đủ key, `shuffle` thuần.
2. Thêm `.github/workflows/ci.yml`: `npm ci` → `lint` → `typecheck` → `test` → `validate:data` (chạy mỗi push/PR).
3. Chạy toàn bộ lần cuối: typecheck + lint + test + build; verify thủ công luồng quiz chính (TOEIC full, TADV, môn chương, retry wrong, review, timer hết giờ, lightbox, đổi ngôn ngữ/theme).

---

## 5. ƯỚC LƯỢNG TÁC ĐỘNG & ĐO LƯỜNG

| Chỉ số | Trước | Mục tiêu sau |
|---|---|---|
| Dung lượng `/data` (audio) | ~50 MB | ≤ 25 MB |
| Ảnh stamp bundle | ~1.3 MB | ≤ 350 kB |
| Re-render khi chọn đáp án (TOEIC 200 câu) | toàn bộ sidebar 200 nút + all part questions mỗi giây | chỉ panel hiện tại + sidebar |
| Code modal lặp | 8 bản | 1 base + config |
| `QuizSession` | 608 dòng | ~150–200 dòng điều phối + module nhỏ |
| Test | 30 | ≥ 45 |

**Ưu tiên đề xuất**: Phase 1 (hiệu năng) > Phase 2 (dữ liệu) > Phase 3 (kiến trúc) > Phase 4–5 (bảo mật, test/CI). Có thể dừng sau mỗi phase vì từng phase độc lập, không phá vỡ nhau — mỗi phase đều giữ build xanh.
