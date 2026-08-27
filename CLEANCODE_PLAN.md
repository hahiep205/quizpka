# KẾ HOẠCH CLEAN CODE — QuizQuik (QuizPKA-Test01)

> **Ngày**: 2026-08-28 · **Tác giả**: phân tích toàn bộ source `src/`, `scripts/`, `public/data`, cấu hình build
> **Trạng thái baseline (đã chạy thực tế tại chỗ)**: ✅ `npm run typecheck` · ✅ `npm run lint` · ✅ `npm test` 48/48 (11 file) · ✅ `npm run validate:data` · ✅ `npm run build`
> **Nguyên tắc tối thượng**: **KHÔNG đổi hành vi người dùng**. Mỗi phase độc lập, build/test xanh sau mỗi phase, xong phase nào commit phase đó.

---

## 0. CÁCH DÙNG PLAN NÀY

- **Đơn vị effort**: 1 điểm ≈ nửa ngày làm việc tập trung của 1 dev.
- **Verify chuẩn** sau mọi thay đổi:
  ```
  npm run typecheck && npm run lint && npm test && npm run build
  ```
  (`build` = validate:data + tsc -b + vite build — bắt luôn lỗi dữ liệu).
- **Convention code** (bắt buộc giữ): 2-space indent, **không dấu `;`** cuối, `type`-only imports (`verbatimModuleSyntax`), `noUnusedLocals` bật, test colocated theo feature (`*.test.ts` cạnh file).
- Muốn nghe/xem/nghi ngờ điều gì khi thực thi → mở mục tương ứng bên dưới, mỗi task đều có **DoD** (định nghĩa "xong").

---

## 1. BỨC TRANH HIỆN TẠI (đã xác minh bằng lệnh, không phải ước đoán)

| Hạng mục | Giá trị thực tế |
|---|---|
| Stack | React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind CSS 4 + Vitest 4 + Oxlint 1.75 |
| Nguồn | ~77 file TS/TSX trong `src/` + 2 script JS (tổng ~6.600 dòng) |
| Bài test hiện có | **9 file test, 30 test**, đều pass |
| Dữ liệu `public/data` | **296 file / 91.84 MB** |
| └ MP3 | **177 file / 86.04 MB (93.7% tổng dung lượng!)** |
| └ JSON | 75 file / 2.82 MB |
| └ PNG | 26 file / 2.25 MB |
| └ WebP | 18 file / 0.72 MB |
| Bundle (dist) | index JS 130.86 kB (gz 33.6) · react 182 kB (gz 57.3) · CSS 87.5 kB (gz 15.4) · PracticeGuestPage chunk 57 kB · DashboardPage chunk 20 kB |
| Deploy | Vercel (`vercel.json`: build = `npm run build`, rewrite SPA — **chưa có Cache-Control**) |
| Chất lượng hiện có | 0 `console.log` · 0 `TODO/FIXME/HACK` · 0 `@ts-ignore` · validation runtime 2 lớp (schema + script) · AbortController khi fetch · lazy-load route/modal · `manualChunks` tách react/icons |

**Top file "nặng nhất" (dòng)**: QuizSession 608 · DashboardPage 598 · index.css 572 · i18n 540 · subjects 453 · SiteHeader 371 · DocumentsPage 283 · QuizSetupModal 241 · DetailedAnalysisContent 222 · CommunityChatModal 213 · ToeicSection 188 · HeroSection 162 · App 161 · ToeicScopePickerModal 166 · QuizQuestionBlock 152 · PracticeGuestPage 130.

**Điểm mạnh cần GIỮ NGUYÊN** (không được phá khi clean):
- Phân tầng `features/quiz` (api / hooks / lib / model / ui) đã rõ ràng.
- `loadQuizQuestions.ts`: AbortController + prefix id theo bank + chapter filter + fallback — tốt, không đụng.
- `toeic.ts` là nguồn sự thật scope TOEIC (createPartFiles/PART_FILES_BY_TEST) — nhưng **`subjects.ts` vẫn hardcode trùng đường dẫn** (xem P3-B).
- `subjectChapters.ts` + `subjectBanks.test.ts` đã refactor tốt, data khớp file thật.
- Base `Dialog` (ui/dialog.tsx) đã có focus trap + Escape + lock scroll + restore focus — nền tốt cho Phase 3.
- `practiceSession.ts` đã validate payload an toàn.

---

## 2. INVENTORY VẤN ĐỀ (ưu tiên giảm dần)

| ID | Vấn đề | File | Severity | Effort | Phase |
|---|---|---|---|---|---|
| CLEAN-01 | **Tính toán O(n²) + re-render toàn bộ mỗi giây** — derived arrays (`partQuestions`, `partStartIndices`, `currentPartStartIndex`, `toeicGroups`, `answeredInPart`…) dựng lại mỗi render, `findIndex` trong loop, timer tik mỗi giây re-render cả 608 dòng | QuizSession.tsx, useQuizTimer.ts | 🔴 P0 | 4 | 1 |
| CLEAN-02 | **`onTimeout()` gọi BÊN TRONG state updater** (side effect trong updater = anti-pattern; StrictMode dev gọi 2 lần; `clearInterval` cũng trong updater); **thiếu reset khi `durationMinutes` đổi prop giữa chừng** | hooks/useQuizTimer.ts | 🔴 P0 | 1 | 1 |
| CLEAN-03 | **Audio TADV 15 file = 60.11 MB** (tadv/tadv2/tadv3 gộp trong `public/data/tadv/`) — con số lớn nhất có thể giảm; chỉ là audio giọng đọc, nén 64–96k mono giảm 50–70% | public/data/tadv/*.mp3 | 🔴 P0 (dung lượng) | 1 | 2 |
| CLEAN-04 | **6 ảnh stamp PNG ~1.26 MB** (197–223 kB/cái) — chuyển WebP ~350 kB | src/assets/{Perfect,Kha,Tam,Qua,Kem,Liet}.png | 🟠 P1 | 0.5 | 2 |
| CLEAN-05 | **Chưa có Cache-Control** — mỗi lần vào quiz fetch lại JSON/audio (296 file tĩnh, không đổi) | vercel.json | 🟠 P1 | 0.5 | 2 |
| CLEAN-06 | **6 modal nhân bản ~40 dòng boilerplate** (visible/state, 2 useEffect, overlay, lock scroll, Escape) — base `Dialog` đã có sẵn nhưng không dùng chung | 6 modal cũ | 🟠 P1 | 2.5 | 3 |
| CLEAN-07 | **42 màu hex duy nhất / 478 chỗ dùng** — QuizSession 179, DetailedAnalysisContent 59, DashboardPage 53, QuizQuestionBlock 38… trong khi `@theme` trong index.css KHÔNG dùng cho các màu này (và đang là blue Tailwind mặc định, KHÔNG phải brand #1CB0F6) | toàn src + index.css | 🟠 P1 | 2 | 3 |
| CLEAN-08 | **3 nơi render exam card gần giống nhau** (Card/Badge/FileText/BookOpen/Clock3 + filter + detail modal riêng) | ToeicSection.tsx · DocumentsPage.tsx · DashboardPage (Home view) | 🟠 P1 | 1.5 | 3 |
| CLEAN-09 | **`subjects.ts` hardcode 21 đường dẫn TOEIC (7 file × 3 đề, dòng 385–439) TRÙNG với `toeic.ts` createPartFiles** — đổi tên file 1 nơi là lệch ngay; chỉ nên có 1 nguồn sự thật | subjects.ts ↔ toeic.ts | 🟠 P1 | 0.5 | 3 |
| CLEAN-10 | **Chuỗi hardcode còn rải rác** (progress "câu"/"Tiến bộ"/"Lần"/"Part X", security overlay, dashboard labels…) dù i18n đã có 466 key; i18n đang kiểu lỏng `Record<string,string>` nên không bắt được thiếu key | QuizSession, ToeicSection, DashboardPage, SecurityOverlay, PracticeGuestPage, i18n.ts | 🟡 P2 | 1.5 | 4 |
| CLEAN-11 | **Type lỏng/trùng**: `Lang` khai báo lại ~10 file, thay vì dùng chung từ `shared/types/app.ts` (hiện file này chỉ 2 dòng!) | shared/types + toàn src | 🟡 P2 | 0.5 | 4 |
| CLEAN-12 | Security `scope: "global"` — block contextmenu/shortcut/devtools chạy toàn app kể cả trang chủ; `SecurityOverlay` tiếng Việt cố định; `SiteHeader` scroll listener không throttle rAF (3× getBoundingClientRect mỗi scroll) | security/config.ts · hooks/useGlobalSecurity.ts · SiteHeader.tsx | 🟡 P2 | 1 | 5 |
| CLEAN-13 | **App.tsx lặp khối try/catch** (2 khối, dòng 58–65 và 90–94) + logic lặp nhỏ | App.tsx | 🟢 P3 | 0.5 | 4 |
| CLEAN-14 | **Thiếu CI** — không có `.github/workflows`, chỉ validate ở build cục bộ | repo root | 🟢 P3 | 0.5 | 6 |
| CLEAN-15 | **Test còn mỏng ở các chỗ rủi ro**: chưa có test `useQuizTimer` (timeout đúng 1 lần / reset / unlimited), `quizGrouping` (O(n²) fix), `i18n` key parity 2 ngôn ngữ, `parsePracticeSession` payload hỏng | features/quiz/hooks, lib | 🟢 P3 | 1 | 6 |

---

## 3. ĐỐI CHIẾU VỚI `OPTIMIZATION_PLAN.md` CŨ (2026-08-28, đang tồn tại trong repo)

Plan này là **bản nâng cấp/thay thế** — các mục cũ còn giá trị được giữ và làm chi tiết hơn, mục đã xong được đánh dấu, mục sai thực tế được sửa:

| Mục trong plan cũ | Trạng thái | Ghi chú |
|---|---|---|
| P0-1 QuizSession O(n²) | ✅ Giữ nguyên giá trị | Nay là CLEAN-01, bổ sung cả `answeredInPart/answeredInGroup` + `displayPartTitle` |
| P0-2 useQuizTimer side-effect trong updater | ✅ Giữ | Nay là CLEAN-02, bổ sung phát hiện mới: **thiếu reset khi đổi `durationMinutes` prop** |
| P0-3 Không memo QuizQuestionBlock | ✅ Giữ | Nằm trong CLEAN-01 |
| P0-4 Ảnh stamp 1.3 MB | ✅ Giữ | Nay là CLEAN-04, đã đo chính xác 1.26 MB / 6 file |
| P1-1 Modal lặp 8 chỗ | ✅ Giữ | Nay là CLEAN-06, đã xác định rõ 6 modal cũ + 4 cái đã dùng base Dialog |
| P1-2 Tách QuizSession | ✅ Giữ | Nằm trong Phase 1 |
| P1-3 TOEIC khai báo 2 nơi | ✅ **VẪN CÒN ĐÚNG — plan cũ chuẩn** | Kiểm tra lại: `subjects.ts` dòng 385–439 hardcode 21 path, `toeic.ts` createPartFiles tạo cùng path. Checkpoint trước đó báo "đã sửa" là SAI. Nay là CLEAN-09 |
| P1-4 Tách DashboardPage 598 dòng | ✅ Giữ | Phân rã nhẹ hơn plan cũ (ưu tiên thấp, không phải mục tiêu chính) |
| P1-5 Hardcode tiếng Việt | ✅ Giữ | Nay là CLEAN-10 |
| P1-6 Audio TADV ~50 MB | ✅ Giữ, **sửa số liệu** | TADV = **60.11 MB / 15 MP3** (trong `public/data/tadv/`, không còn ở root) — mục tiêu ≤ 25 MB |
| P1-7 Ảnh TADV reading PNG | ✅ Giữ | 12 PNG = 1.61 MB trong tadv/ |
| P1-8 Cache dữ liệu tĩnh | ✅ Giữ | Nay là CLEAN-05 |
| P1-9 Tách chunk PracticeGuestPage | ⏸️ Gác lại | Bundle hiện OK (57 kB), ưu tiên thấp |
| P2-1 detect.ts debugger + scope global | ✅ Giữ | Nay là CLEAN-12 (Phase 5, làm cuối, có thể bỏ qua nếu không muốn đổi UX) |
| P2-2 blockAll chặn contextmenu toàn cục | ✅ Giữ | Trong CLEAN-12 |
| P2-3 App.tsx lặp mã | ✅ Giữ | Nay là CLEAN-13 |
| P2-4 useRetryHistory ghi thừa 1 lần | ⏸️ Bỏ | Quá nhỏ, rủi ro/benefit không đáng |
| P2-5 SiteHeader scroll không rAF | ✅ Giữ | Trong CLEAN-12 |
| P2-6 mapBankItems acceptedAnswers tính thừa | ⏸️ Bỏ | Quá nhỏ |
| P2-7 parsePracticeSession validate thêm | ✅ Giữ nhẹ | Bổ sung `durationMinutes > 0` + `questionLimit >= 0` khi đụng Phase 4 |
| P2-8/P2-9 Test + CI | ✅ Giữ | Nay là Phase 6 (CLEAN-14/15) |
| **MỚI** 42 màu hex / 478 chỗ | 🆕 Thêm | CLEAN-07 — phát hiện mới, chưa có trong plan cũ |
| **MỚI** 3 nơi render exam card trùng | 🆕 Thêm | CLEAN-08 |
| **MỚI** i18n kiểu lỏng + Lang khai báo lại | 🆕 Thêm | CLEAN-10/11 |

---

## 4. NGUYÊN TẮC THỰC THI (đọc trước khi code)

1. **Không đổi hành vi**: mọi refactor phải cho ra UI/UX/luồng dữ liệu tương đương. Nếu cần đổi UX → tách thành task riêng, báo user.
2. **Mỗi phase một commit** (hoặc vài commit nhỏ trong phase) — không lẫn phase.
3. **Working tree ĐANG BẨN** (tái cấu trúc dữ liệu chưa commit: gom TADV, tách bank JSON theo chương, `subjectBanks.test.ts` mới). → **Phase 0 phải commit trước** để refactor không dính vào.
4. Refactor lớn làm trên nhánh `codex/clean-*` (prefix `codex/` theo convention) nếu muốn an toàn; hoặc làm thẳng `main` nếu nhóm nhỏ.
5. Đo lường trước – sau: ghi lại bundle size, số re-render (React DevTools Profiler), dung lượng `/data` trước khi đổi.
6. Mọi hàm thuần (grouping, selectors, timer logic) tách ra **lib thuần** để test được — không test qua component.

---

## 5. CÁC PHASE CHI TIẾT

---

### PHASE 0 — Baseline & commit sạch (effort 0.5)

**Lý do**: dọn đường cho mọi phase; tránh refactor chồng lên data-restructuring đang dở.

| # | Việc | DoD |
|---|---|---|
| 0.1 | `git add -A && git commit` trạng thái data-restructuring hiện tại (gom TADV, tách JSON theo chương, subjectBanks.test.ts…) với message mô tả rõ | `git status` sạch |
| 0.2 | Ghi baseline vào file `docs/baseline-2026-08-28.md`: bundle size (dist), dung lượng `/data` theo ext, danh sách 9 file test/30 test, điểm Lighthouse nếu chạy được | file tồn tại trong repo |
| 0.3 | (Tùy chọn) tạo nhánh `codex/clean-code` | checkout thành công |

**Verify**: `git status` sạch · `npm run build` xanh.

---

### PHASE 1 — Hiệu năng render Quiz (P0 · effort ~4) — **ƯU TIÊN CAO NHẤT**

> **✅ TRẠNG THÁI: HOÀN THÀNH (2026-08-28) — commit `8950bdd`** `perf(quiz): extract QuizSidebar, memoize derived data, stable handlers`
> - 1-A ✅ `useQuizTimer` viết lại (StrictMode-safe, `onTimeout` 1 lần qua guard, reset khi đổi duration) + `useQuizTimer.test.ts` (8 test)
> - 1-B ✅ `quizGrouping.ts` (hàm thuần) + `quizGrouping.test.ts` (10 test)
> - 1-C ✅ Memo hoá derived data (dời lên trên early return, đúng rules-of-hooks); `handleAnswer`/`goToQuestion`/`handleFinish`/`handleRetryWrong` = `useCallback`; xoá O(n²) → Map; `QuizQuestionBlock` bọc memo
> - 1-D ✅ Tách `QuizSidebar` (318 dòng, React.memo, `countAnsweredInRange`)
> - 1-D.1 ⏸️ Tạm hoãn `QuizTimerBadge` tách tick 1s (theo ghi chú rủi ro trong plan — chấp nhận bước trung gian, cha vẫn re-render theo giây)
> - Verify: typecheck ✅ lint ✅ 48/48 test ✅ build ✅

**Mục tiêu số**: người dùng chọn đáp án / timer tik 1s không còn re-render toàn bộ 608 dòng + sidebar 200 nút; timeout chạy đúng 1 lần; đổi thời lượng giữa chừng hoạt động đúng.

#### 1-A. Sửa `useQuizTimer` trước (file: `src/features/quiz/hooks/useQuizTimer.ts`, 33 dòng — nhỏ, dễ, test được)

**Vấn đề đã xác nhận trong code hiện tại**:
```ts
setSecondsLeft((remaining) => {
  if (remaining <= 1) {
    window.clearInterval(timer)   // side effect trong updater
    onTimeout()                   // side effect trong updater → StrictMode dev gọi 2 lần
    return 0
  }
  return remaining - 1
})
```
+ Effect deps chỉ `[isRunning, onTimeout, timed]` → đổi `durationMinutes` giữa chừng thì `secondsLeft` không được đặt lại (reset không nằm trong effect).

**Hành động**:
1. Bỏ mọi side effect khỏi updater: `setSecondsLeft` chỉ trả giá trị mới (`Math.max(0, remaining - 1)`).
2. Thêm `useEffect` riêng theo dõi `secondsLeft === 0 && timed && isRunning` → gọi `onTimeout()` đúng 1 lần bằng `useRef(false)` (reset ref khi reset/timed đổi).
3. Thêm effect: khi `durationSeconds` (prop) đổi → gọi `reset()` (dùng callback ổn định).
4. Giữ API `{ secondsLeft, elapsedSeconds, reset }` — không đổi chữ ký để không lan.

**DoD**: test mới `useQuizTimer.test.ts` phủ: (a) timeout gọi đúng 1 lần khi chạm 0, (b) không timed → secondsLeft = 0, elapsed tăng, không onTimeout, (c) reset về đúng duration, (d) đổi durationMinutes giữa chừng → reset áp dụng. Dùng `vi.useFakeTimers()`.

#### 1-B. Tách tính toán thuần ra `lib/quizGrouping.ts` (MỚI)

**Vấn đề**: QuizSession dựng lại mỗi render: `partQuestions` (filter), `partQuestionIds` (new Set), `partStartIndices` (reduce), `currentPartStartIndex` (findIndex), `toeicGroups`/`toeicTwoLevelData` (IIFE), `answeredInPart`/`answeredInGroup` (slice().filter()), số thứ tự câu (findIndex trong map → O(n²)).

**Hành động**:
1. Tạo `src/features/quiz/lib/quizGrouping.ts` — hàm thuần, nhận `questions: QuizQuestion[]`, `answers`, `partKey` → trả:
   - `buildQuestionNumberMap(questions): Map<string, number>` — dựng 1 lần, thay `findIndex` (xóa O(n²)).
   - `getPartQuestions(questions, partKey)`, `getPartStartIndices(questions)`, `getCurrentPartStartIndex(questions, currentId)`, `buildToeicGroups(questions)`, `getAnsweredInPart(...)`, `getAnsweredInGroup(...)`.
2. Viết test `quizGrouping.test.ts` cho từng hàm (TOEIC part3 39 câu, TADV, môn chương) — dữ liệu giả nhỏ, khẳng định output ổn định.
3. Trong QuizSession thay toàn bộ đúng hàm đó; nếu phát hiện logic cũ sai sót thì **ghi chú, không tự sửa hành vi** (báo user nếu thấy lệch).

#### 1-C. `useMemo`/`useCallback` hoá + bọc memo con (file: QuizSession.tsx, QuizQuestionBlock.tsx)

**Hành động**:
1. Bọc tất cả derived list trong `useMemo` theo đúng deps (`questions`, `answers`, `currentQuestionId`, …).
2. `const handleAnswer = useCallback((id, value) => setAnswers(prev => ({ ...prev, [id]: value })), [])` — functional setState nên không cần deps khác.
3. `QuizQuestionBlock` bọc `React.memo`; props `onAnswer` giờ ổn định identity.
4. `partNavigationItems`/`toeicGroups` render thành component con (`PartNav`, `ToeicGroupNav`, `Sidebar`) nhận props memo — kết hợp 1-D.

**DoD**: React DevTools Profiler: chọn đáp án + 10s timer → số component re-render giảm rõ (mục tiêu: QuizSession thân không re-render khi timer tik; chỉ TimerBadge re-render).

#### 1-D. Tách component con khỏi `QuizSession` (608 dòng → ~250–300 điều phối)

**Hành động** (mỗi lần tách 1 file, build xanh ngay):
1. `ui/QuizTimerBadge.tsx` — nhận `secondsLeft`, cập nhật mỗi giây; `React.memo` để phần còn lại không re-render theo giây.
   - *Cách tách timer ra khỏi re-render cha đúng chuẩn*: đưa `useQuizTimer` xuống gần `PracticeGuestPage` hoặc dùng pattern "state một phần nằm ở con" — tối thiểu: `QuizTimerBadge` tự gọi interval riêng hiển thị, cha chỉ giữ `onTimeout` (bảo toàn hành vi). Tránh làm phức tạp; nếu rủi ro cao, chấp nhận bước trung gian (cha vẫn re-render theo giây) rồi tối ưu sau.
2. `ui/QuizSidebar.tsx` — nav câu hỏi/part/TOEIC groups (nhận `questions`, `answerMap`, `currentId`, callbacks).
3. `ui/QuizQuestionPanel.tsx` — header part, image/audio/passage, `QuizQuestionBlock` list.
4. `ui/QuizResultPanel.tsx` — stats, `ResultStamp`, retry, progress.
5. `ui/QuizHeader.tsx` — progress bar + timer.
6. Giữ `QuizSession` chỉ: state chính + khối `Dialog` confirm/lightbox (đã tốt).

**DoD**: build xanh; chơi thử TOEIC full test + TADV + môn chương: chọn đáp án, next/prev, đổi part, timer hết giờ, retry wrong, review đúng như cũ.

#### Phase 1 — Verify tổng
```
npm run typecheck && npm run lint && npm test && npm run build
```
+ Đo lại bundle (không được tăng đáng kể), Profiler ghi số re-render, chụp trước/sau.

---

### PHASE 2 — Dữ liệu & tài nguyên (P0/P1 · effort ~2) — **giảm tải lớn nhất về MB**

**Hiện trạng đã đo**: `/data` = 91.84 MB; TADV MP3 = **60.11 MB / 15 file**; toeic-test MP3 ≈ 26 MB / 162 file; stamp PNG 6 file ≈ 1.26 MB.

#### 2-A. Nén audio TADV (ưu tiên #1 toàn project về dung lượng)
- **File**: `public/data/tadv/*.mp3` (15 file: 5 audio × 3 đề — đã gom về 1 thư mục).
- **Hành động**: re-encode bằng ffmpeg: `ffmpeg -i in.mp3 -codec:a libmp3lame -b:a 64k -ac 1 out.mp3` (giọng đọc, mono 64–96k vẫn nghe rõ). **Giữ nguyên tên file + đường dẫn** (JSON tham chiếu theo tên).
- **Target**: 60.11 MB → ≤ 25 MB (giảm ≥ 58%).
- **DoD**: `npm run validate:data` xanh (check media tồn tại) · nghe thử ≥ 1 file mỗi đề (Part 1–5) · ghi lại MB trước/sau.

#### 2-B. Nén ảnh TADV reading PNG → WebP (12 file = 1.61 MB)
- **Hành động**: `cwebp -q 75` hoặc `sharp` giữ tên (đổi `.png` → `.webp` thì **phải** cập nhật đường dẫn trong JSON `tadv*/reading*.json`; kiểm tra bằng validate:data). Target ≤ 0.6 MB.
- **DoD**: ảnh hiển thị đúng trong Reading phần/đề · validate xanh.

#### 2-C. Chuyển 6 stamp PNG → WebP (src/assets)
- **Hành động**: nén 6 file (197–223 kB) → WebP chất lượng 80, đổi import trong `ui/ResultStamp.tsx`; hoặc giữ PNG nếu thiết kế cần trong suốt tốt (WebP hỗ trợ alpha OK).
- **Target**: 1.26 MB → ~350 kB.

#### 2-D. Cache-Control trên Vercel (file: `vercel.json`)
- **Hành động** thêm:
  ```json
  "headers": [
    { "source": "/data/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800, stale-while-revalidate=86400" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ]
  ```
- **Lưu ý**: dữ liệu /data đang thay đổi trong thời gian dev (tái cấu trúc) → **chỉ deploy header này sau khi data ổn định** (sau Phase 0 commit). `/assets` có tên băm nên immutable an toàn.
- **DoD**: deploy preview → Network tab thấy `cache-control` đúng, lần vào quiz 2 không fetch lại.

#### Phase 2 — Verify
```
npm run validate:data && npm run build
```
+ Đo lại `/data` theo ext (mục tiêu tổng 91.84 → ≤ ~58 MB chưa tính toeic). TOEIC audio 25.94 MB là bản ghi đề thi (bản quyền học liệu) → **KHÔNG đụng**, chỉ bật cache.

---

### PHASE 3 — DRY: modal + exam card + token màu (P1 · effort ~4.5) — **giá trị bảo trì lớn nhất**

#### 3-A. Base modal + hook dùng chung (CLEAN-06)
**Hiện trạng**: 6 modal cũ nhân bản ~40 dòng: `QuizSetupModal` (241), `CommunityChatModal` (213), `ToeicScopePickerModal` (166), `ToeicAnnouncementModal` (108), `HcmChapterPickerModal` (98), `TadvPickerModal` (97). Đã có base `Dialog` (focus trap, Escape, lock scroll, restore focus) nhưng 6 modal này tự viết `visible/state` + 2 useEffect + overlay riêng; `ContactModal`/`LoginModal`/`ReviewPanel`/confirm/lightbox đã dùng `Dialog`.

**Hành động**:
1. Mở rộng `ui/dialog.tsx` (hoặc tạo `ui/modal.tsx` wrapper) thêm props: `maxWidth`, `animation` (mặc định `contact-modal-in/out` — tái dùng keyframes có sẵn), `footer`, `showClose`.
2. Tạo `src/hooks/useModalVisibility.ts`: gói pattern `visible/state` + timing animation (open/close) — trả `{ isOpen, open, close, state }`; modal cũ chỉ giữ `setState` bên ngoài.
3. Refactor tuần tự, **mỗi modal 1 commit**: `ToeicScopePickerModal` → `HcmChapterPickerModal` → `TadvPickerModal` → `QuizSetupModal` → `ToeicAnnouncementModal` → `CommunityChatModal`.
4. Đồng bộ animation: nếu chuyển hết sang class CSS chung thì xóa class cũ thừa trong index.css.
5. **Sau cùng**: kiểm tra `Dialog` đã đủ cho `ContactModal`/`LoginModal` (không phải thay — chúng đã dùng).

**DoD**: mỗi modal mở/đóng có animation, Escape, lock scroll, focus như cũ; tổng dòng lặp giảm ~240 dòng; build + test xanh sau mỗi commit.

#### 3-B. Nguồn sự thật TOEIC — hết hardcode trùng (CLEAN-09)
**Hiện trạng**: `subjects.ts` dòng 385–439 hardcode 21 path `/data/toeic-test/Test-0X/PartY/*.json`; `toeic.ts` `createPartFiles` sinh y hệt.

**Hành động**:
1. Trong `toeic.ts` export thêm `getToeicTestBanks(testId): string[]` (wrap `Object.values(PART_FILES_BY_TEST[id])`) — hoặc tái dùng `getToeicScopeOptions(examId).find(s => s.id === "full").files`.
2. Trong `subjects.ts` phần 3 đề TOEIC: thay mảng path cứng bằng lời gọi `getToeicTestBanks(id)` (giữ `id/code/name/category/count/duration` như cũ).
3. Thêm test `toeicSources.test.ts`: so khớp — mọi file trong `subjects.ts` TOEIC banks tồn tại trong `PART_FILES_BY_TEST` và ngược lại, `full.files.length === 7`.
4. `questionCount`/`durationMinutes` (200/120) đang lặp giữa subjects.ts ↔ toeic.ts: chọn 1 nơi làm hằng (`TOEIC_FULL_COUNT`, `TOEIC_FULL_DURATION` trong toeic.ts), subjects.ts import.

**DoD**: đổi tên 1 file trong toeic.ts → test bắt lệch ngay; build xanh.

#### 3-C. Gộp 3 nơi hiển thị exam card (CLEAN-08)
**Hiện trạng**: `ToeicSection.tsx` (188), `DocumentsPage.tsx` (283), `DashboardPage` Home view — mỗi nơi tự vẽ Card/Badge/FileText/BookOpen/Clock3 + filter + detail modal + `useExamLaunch`.

**Hành động**:
1. Tạo `src/components/exams/ExamCard.tsx` (hiển thị 1 card: title, category, count, duration, badge) + `ExamCardGrid.tsx` (list + layout) + `ExamDetailModal.tsx` (dùng base Dialog từ 3-A).
2. Tạo hook `useExamFilter` (lọc theo query/category/subject) dùng chung cho DocumentsPage + DashboardPage search.
3. `ToeicSection` dùng `ExamCard` cho 3 fake-test TOEIC (giữ layout landing khác nếu cố ý — chỉ dùng chung card, không ép layout).
4. Đảm bảo `useExamLaunch` vẫn là điểm duy nhất để mở quiz (đã DRY từ commit 00b393d — giữ).

**DoD**: 3 trang render giống hệt trực quan; mở quiz từ cả 3 nơi OK.

#### 3-D. Token hoá 42 màu hex (CLEAN-07)
**Hiện trạng**: 42 màu duy nhất / **478 chỗ dùng**; `@theme` trong index.css đang là palette blue Tailwind mặc định **không phải brand** (`#1CB0F6` Duolingo-blue không có token).

**Hành động**:
1. Thêm token brand vào `@theme` trong `src/index.css` (giữ token cũ, không phá):
   ```css
   --color-brand: #1CB0F6;
   --color-brand-dark: #189CD8;
   --color-brand-deep: #129BDC;
   --color-brand-soft: #E8F7FE;
   --color-brand-tint: #B3E5FC;
   --color-ink: #100F3E;
   --color-ink-soft: #4B4B4B;
   --color-ink-muted: #777777;
   --color-success-duo: #58CC02;   --color-success-soft: #E6F5D9;   --color-success-dark: #3A8A00;
   --color-warn-duo: #FFD000;      --color-warn-soft: #FFF8E1;      --color-warn-dark: #9A7B00;
   --color-line: #E5E5E5;          --color-line-strong: #DCDCDC;
   ```
2. Thay lần lượt theo nhóm ưu tiên: **QuizSession (179 chỗ)** → DetailedAnalysisContent (59) → DashboardPage (53) → QuizQuestionBlock (38) → ReviewPanel (24) → CommunityChatModal (23) → còn lại. Mỗi nhóm 1 commit.
3. `React`/`clsx`: dùng utility class `bg-brand`/`text-ink`… từ Tailwind 4 (theme token tự sinh class).
4. **Không** đổi màu nhìn thấy được — token map 1:1 theo giá trị hex cũ (kiểm tra Diff visual từng nhóm).

**DoD**: `grep -c '#[0-9a-fA-F]\{6\}'` trong src giảm từ 478 → < 60 (chỉ còn màu đặc biệt như overlay rgba); kiểm tra visual các trang chính không đổi màu.

#### Phase 3 — Verify
```
npm run typecheck && npm run lint && npm test && npm run build
```
+ Visual: Home, Documents, Dashboard, TOEIC picker, quiz setup, community chat, login/contact.

---

### PHASE 4 — i18n & types (P1 · effort ~2)

#### 4-A. Dồn chuỗi hardcode vào i18n (CLEAN-10)
**Còn lại ở**: QuizSession (progress "câu"/"Tiến bộ"/"Lần"/"Hiện tại"/"Part X"), ToeicSection ("Luyện thi TOEIC"), DashboardPage (mobileNavLabels, ranking names), SecurityOverlay (tiếng Việt cứng), PracticeGuestPage (copy nhỏ), QuizSession TADV labels.

**Hành động**:
1. Thêm key vào nhóm phù hợp trong `i18n.ts` (appTranslations/quizCopy/dashboardCopy…) đủ cả `vi` + `en`.
2. Đưa `SecurityOverlay` copy vào i18n (hiện tiếng Việt cố định dù app có EN).
3. Cảnh giác: `lazy` fields như "Part 1" cần hàm `tPartLabel(n)` — thêm helper, không string thủ công.

#### 4-B. Typed i18n (CLEAN-11 phần i18n)
- **Hành động**: đổi các group từ `Record<string, string>` sang `{ vi: Record<K,string>; en: Record<K,string> }` với `satisfies` + helper `defineCopy` so khớp **cùng tập key 2 ngôn ngữ** → typecheck bắt thiếu key ngay lập tức.
- **DoD**: test `i18n.test.ts`: với mọi group, `Object.keys(vi).sort() === Object.keys(en).sort()`.

#### 4-C. Gộp type `Lang` dùng chung (CLEAN-11)
- **Hành động**: `shared/types/app.ts` (hiện 2 dòng) định nghĩa `export type Language = "vi" | "en"` (+ `Lang = Language` alias để khỏi sửa 10 file bên import khác nếu muốn ít diff); từ từ đổi import tụi file-local về dùng chung.
- **DoD**: typecheck xanh; không còn khai báo trùng `type Lang = ...` trong file component.

#### 4-D. Nhặt thêm (CLEAN-13 + P2-7 cũ)
- `App.tsx`: tách `localDateKey()` thành helper trong `lib/utils.ts`, gộp 2 khối try/catch → DoD: giảm ~20 dòng, hành vi giữ nguyên.
- `practiceSession.ts`: thêm validate `durationMinutes > 0`, `questionLimit >= 0` (kèm test payload hỏng).

#### Phase 4 — Verify
```
npm run typecheck && npm run lint && npm test && npm run build
```
+ Đổi ngôn ngữ vi/en trên Home, Documents, Dashboard, quiz: không còn chuỗi tiếng Việt hiện khi chọn EN.

---

### PHASE 5 — Bảo mật có chọn lọc (P2 · effort ~1) — **TÙY CHỌN, làm cuối**

> ⚠️ Change behavior có chủ đích — chỉ làm nếu user xác nhận.

**Hành động (từng bước, có thể bỏ bớt)**:
1. `security/config.ts`: đổi `scope` từ `"global"` → `"quiz"` (chỉ kích hoạt khi ở PracticeGuestPage đang thi): contextmenu/shortcut/devtools block không chạy trên trang chủ/dashboard nữa — trải nghiệm bình thường.
2. `SiteHeader.tsx`: throttle scroll bằng `requestAnimationFrame` (giữ kết quả cuối rAF) — không thay đổi hành vi.
3. `detect.ts`: giữ `debugger` chỉ khi gọi (đã tinh chỉnh), không đụng nếu không cần.
4. Nếu yêu cầu khắt khe (tùy user): chặn copy/paste + đếm `visibilitychange` lúc thi; **mặc định KHÔNG làm** vì đổi UX.

**DoD**: mở app → chuột phải/devtools bình thường ở trang chủ; vào quiz → block như cũ; build xanh.

---

### PHASE 6 — Test & CI (P3 · effort ~1.5)

**Hành động**:
1. Test bổ sung (mục tiêu 30 → **≥ 45**):
   - `useQuizTimer.test.ts` (timeout 1 lần, reset, unlimited, đổi duration) — đã ở Phase 1, nhắc lại cho chắc.
   - `quizGrouping.test.ts` (số thứ tự, part start, toeicGroups, answeredInGroup).
   - `toeicSources.test.ts` (subjects ↔ toeic.ts khớp path).
   - `i18n.test.ts` (key parity 2 ngôn ngữ, không key rỗng).
   - `practiceSession.test.ts` mở rộng (duration âm/0, limit âm, JSON sai kiểu).
   - `shuffle`/`getQuizStats` edge (0 câu, 1 câu) nếu có hàm.
2. Add `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     verify:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: npm run lint
         - run: npm run typecheck
         - run: npm test
         - run: npm run validate:data
   ```
3. Chạy full bộ cuối cùng + checklist thủ công: TOEIC full test, TADV đề 1–3, môn chương (HCM/HIS/MLN), retry wrong, review, timer hết giờ, lightbox, đổi ngôn ngữ/theme, mobile nav.

**DoD**: CI xanh trên push đầu tiên; test ≥ 45 pass.

---

## 6. TÁC ĐỘNG DỰ KIẾN (đo được)

| Chỉ số | Trước | Sau (mục tiêu) | Phase |
|---|---|---|---|
| Dung lượng `/data` | 91.84 MB | ~56–58 MB (nén TADV + WebP; toeic giữ nguyên) | 2 |
| Audio TADV | 60.11 MB / 15 MP3 | ≤ 25 MB | 2 |
| Stamp bundle | 6 PNG ~1.26 MB | ~350 kB | 2 |
| Cache | không có | /data 7 ngày + /assets immutable | 2 |
| Re-render khi timer tik 1s | toàn bộ QuizSession + sidebar 200 nút | chỉ TimerBadge (+ phần phụ thuộc) | 1 |
| `findIndex` trong loop (O(n²)) | có (part3 39 câu × 200) | Map O(1) | 1 |
| Modal boilerplate | 6 bản × ~40 dòng | 1 base + hook | 3 |
| Màu hex hardcode | 42 màu / 478 chỗ | < 60 chỗ | 3 |
| Path TOEIC | 2 nguồn (21 path cứng + sinh) | 1 nguồn (toeic.ts) | 3 |
| Test | 30 | ≥ 45 | 1,6 |
| CI | không có | GitHub Actions | 6 |

**Tổng effort ước lượng**: ≈ **13–14 điểm** (1 điểm ≈ nửa ngày) ≈ 6.5–7 ngày làm liên tục; có thể dừng sau bất kỳ phase nào vì từng phase độc lập.

---

## 7. THỨ TỰ KHUYẾN NGHỊ & QUYẾT ĐỊNH CẦN USER

1. **Phase 0 trước tiên** (commit sạch) — bắt buộc, không hỏi.
2. **Phase 1** (hiệu năng quiz) — đề xuất làm ngay: đúng nghĩa "clean code + cải thiện trải nghiệm", rủi ro thấp nếu giữ DoD.
3. **Phase 2** (dữ liệu) — hiệu quả MB lớn nhất; lưu ý: **nén audio không phá file gốc** (làm bản nén, giữ bản gốc ngoài repo nếu cần), **header cache deploy sau khi data ổn định**.
4. **Phase 3** (DRY) — giá trị bảo trì lớn; nhóm 3-B (nguồn TOEIC) nên làm sớm trong phase vì rủi ro lệch dữ liệu thấp nhất.
5. **Phase 4–6** theo thứ tự; **Phase 5 (bảo mật scoped) cần user xác nhận** trước vì đổi UX.
6. **Cần user quyết**: (a) làm thẳng `main` hay nhánh `codex/clean-code`? (b) có đồng ý đổi scope bảo mật Phase 5 không? (c) nén audio TADV có chấp nhận giảm bitrate (64–96k, mono) không?

---

## 8. RỦI RO & "KHÔNG ĐƯỢC LÀM"

- ❌ Không đổi nhánh dữ liệu `/data` khi chưa có Phase 0 commit — sẽ lẫn với data-restructuring đang dở.
- ❌ Không tự sửa logic quiz khi refactor mà thấy "có vẻ sai" — phải báo user, vì có thể là chủ ý nghiệp vụ.
- ❌ Không đụng `loadQuizQuestions.ts` (đã tốt: AbortController/prefix id/chapter filter/fallback).
- ❌ Không nén TOEIC audio (25.94 MB / 162 file) — là bản ghi đề thi; chỉ bật cache.
- ❌ Không đổi màu nhìn thấy trong Phase 3-D — token map 1:1.
- ❌ Không xóa `OPTIMIZATION_PLAN.md` nếu user chưa đồng ý (giữ làm tài liệu, file này là bản kế nhiệm).
- ⚠️ `React.memo` + `useCallback` với component nhận object props phức tạp có thể phản tác dụng — kiểm tra Profiler, không memo mù.
- ⚠️ StrictMode dev: side effect trong updater (CLEAN-02) có thể chưa gây lỗi khi chạy production, nhưng phải sửa vì là nguồn bug tiềm ẩn (timeout 2 lần, interval nhầm).
