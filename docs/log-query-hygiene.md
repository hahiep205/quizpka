# Log Query Hygiene (Supabase)

Bối cảnh: 01–02/10/2026 project đốt **51.18 GB "Log Query" chỉ trong 2 ngày**
(hạn mức free plan: 100 GB/tháng, grace period đến đầu 2027 — hiện chỉ cảnh báo,
chưa tính overage).

Cách Supabase đo: **Log Query = số GB log bị QUÉT mỗi lần ĐỌC log** (Log
Explorer trên dashboard, Logs Management API, CLI). Đặc tính quan trọng:

- **Không có cache** — chạy lại cùng câu query = quét lại từ đầu, tốn gấp đôi.
- **Cửa sổ thời gian là yếu tố lớn nhất** — window 24h quét ~8× window 3h, dù
  kết quả trả về có thể như nhau.
- **Filter phải nằm TRONG câu query** mới giảm scan — lọc sau khi kéo dữ liệu
  không tiết kiệm gì.

## 1. Quy tắc cho mọi truy vấn log (agent + người)

1. Window khởi điểm **5–15 phút**; chỉ mở rộng khi thật cần, tối đa **3h**.
2. `where source = '...'` phải nằm trong câu query (`edge_logs`,
   `postgres_logs`, `auth_logs`, `function_edge_logs`...).
3. Mỗi đợt verify = **MỘT query tổng hợp** trả nhiều câu hỏi; **cấm poll**
   (chạy lặp để "chờ" điều gì đó xuất hiện).
4. Trước khi mở log, tự hỏi: **câu này trả lời được từ DB không?** (bảng dưới).

## 2. Ưu tiên DB thay vì log (không bị đo Log Query)

| Câu hỏi | Dùng thay thế |
|---|---|
| User login lúc nào, IP nào | `select * from public.user_login_events` |
| Bao nhiêu request bị rate-limit/rejected | `select * from public.security_metrics_daily` |
| Cron có chạy không, chạy khi nào | `select ... from cron.job_run_details` |
| Schema, RLS, grants, đếm dòng, sửa data test | Management API `POST /v1/projects/{ref}/database/query` |
| Function nào đang deploy, migration nào đã áp dụng | `supabase functions list` / `supabase migration list` |
| Lỗi GoTrue, gateway status code, IP/UA realtime | MỚI dùng log API (window ≤ 3h) |

Management API database/query (miễn phí, chạy bằng access token `sbp_...`):

```
POST https://api.supabase.com/v1/projects/qwbujoppcqpnummhpfbs/database/query
Authorization: Bearer <access-token>
Content-Type: application/json
{"query": "select ..."}
```

## 3. Template Log Explorer sẵn dùng (window 3h ≈ vài trăm MB/câu)

Thay `<START>`/`<END>` bằng ISO time (ví dụ `2026-10-02T10:00:00Z`), mặc định
chênh nhau 3 giờ.

Edge — request theo user/path (điều tra user/path khi cần):

```sql
select log_attributes['request.headers.cf_connecting_ip'] as ip,
 log_attributes['request.path'] as path,
 log_attributes['request.sb.auth_user'] as auth_user,
 count() as requests, max(timestamp) as last_seen
from logs where source = 'edge_logs'
 and timestamp >= '<START>' and timestamp < '<END>'
group by ip, path, auth_user order by requests desc limit 100
```

Auth — lỗi đăng nhập gần đây:

```sql
select timestamp, event_message
from logs where source = 'auth_logs'
 and timestamp >= '<START>' and timestamp < '<END>'
 and event_message ilike '%error%'
order by timestamp desc limit 50
```

Postgres — lỗi SQL:

```sql
select timestamp, event_message
from logs where source = 'postgres_logs'
 and timestamp >= '<START>' and timestamp < '<END>'
 and event_message ilike '%ERROR%'
order by timestamp desc limit 50
```

Tổng quan các nguồn log có dữ liệu trong window (1 câu thay vì mở từng source):

```sql
select source, count() as rows, min(timestamp) as first_seen, max(timestamp) as last_seen
from logs
where timestamp >= '<START>' and timestamp < '<END>'
group by source order by rows desc
```

## 4. `scripts/find-user-ip.js` đã bị XÓA

Xóa ngày 03/10/2026 sau khi Log Query usage lên 70 GB/100 GB chỉ trong 1 ngày —
mỗi lần chạy window 24h của nó quét gần trọn retention 1 ngày của `edge_logs`.
Bản gốc nằm tại `trash/scripts/find-user-ip.js` (thùng rác, không xóa, không
dùng). Nếu tương lai cần tra IP theo user: dùng template Edge ở mục 3 với
window 3h thay vì khôi phục script này.

## 5. Đợt cắt giảm 2026-10-04: giảm VOLUME log từ gốc

Quy tắc đọc (mục 1–2) chỉ giữ được khi volume log nhỏ — mỗi lần đọc quét toàn
bộ log trong window, nên volume càng nhỏ scan càng rẻ. Migration
`20261004100000…20261004100200` + thay đổi frontend/edge-functions giảm
~65–75% request (mỗi request = 1+ dòng log edge): Admin bỏ dump bảng nguyên
vẹn, notifications về 1 digest RPC, bỏ poll 60s, gộp rate-gate edge, same-origin
proxy bỏ preflight. Sau khi deploy 24–48h, so sánh bằng **MỘT** query tổng hợp
window 3h ở mục 3 — cấm mở Log Explorer window 24h/7d để "xem tổng thể".
