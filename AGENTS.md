# AGENTS.md — quy ước cho AI agent làm việc trong repo này

## Supabase Log Query (bắt buộc)

Log Query của Supabase đo **GB log bị QUÉT mỗi lần ĐỌC log** (dashboard,
Management API, CLI); không có cache — chạy lại là quét lại. Project này đã đốt
**51 GB chỉ trong 2 ngày** (01–02/10/2026) vì truy vấn window rộng lặp lại.
Hạn mức free plan: 100 GB/tháng.

Khi cần đọc log Supabase:

1. Window khởi điểm **5–15 phút**, tối đa **3h**; `where source = '...'` phải
   nằm **trong** câu query.
2. Một đợt verify = **một query tổng hợp** trả nhiều câu hỏi; **cấm poll**.
3. **DB-first**: ưu tiên `POST /v1/projects/{ref}/database/query` (Management
   API — KHÔNG bị đo Log Query) và các bảng sẵn có (`user_login_events`,
   `security_metrics_daily`, `cron.job_run_details`). Log API chỉ dùng cho thứ
   DB không có: lỗi GoTrue, gateway status, IP/user-agent realtime.
4. `scripts/find-user-ip.js` đã bị **XÓA khỏi repo** (03/10/2026) vì góp phần đốt
   70 GB/100 GB Log Query. Bản lưu tại `trash/scripts/find-user-ip.js` — KHÔNG
   tái tạo hoặc khôi phục nếu không có yêu cầu rõ ràng từ người dùng; thay vào đó
   dùng template 3h-window trong `docs/log-query-hygiene.md`.

Chi tiết + template query sẵn dùng: `docs/log-query-hygiene.md`.

## Repo

- `trash/` là thùng rác lưu trữ: **KHÔNG xóa** file nào trong đó, **KHÔNG
  import** bất kỳ file nào từ `trash/` vào hệ thống. Manifest: `trash/README.md`.
- Task phân tích/audit mặc định **chỉ đọc** — không sửa code nếu không được
  yêu cầu rõ ràng.
- Không tự commit; người dùng chủ động commit.
