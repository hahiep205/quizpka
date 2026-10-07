# Quizpka

Quizpka là nền tảng ôn tập và luyện thi qua Quiz dành cho sinh viên Phenikaa, với kho tài liệu đa dạng cho nhiều môn học, hỗ trợ ôn tập giữa kỳ và cuối kỳ.

Website: [quizpka.online](https://quizpka.online)

## Tính năng

- Đăng nhập 1 chạm nhanh chóng: Hỗ trợ đăng nhập qua Google, vào học ngay lập tức không cần nhớ mật khẩu.
- 3 chế độ làm bài đa dạng: Luyện tập, thi thử và luyện tập hard; tích hợp tính năng thi thử TADV bám sát cấu trúc đề Tiếng Anh đầu vào của Phenikaa.
- Lưu lịch sử & Tự động gom câu sai: Giữ lại toàn bộ lịch sử làm bài và tự động tổng hợp các câu làm sai để giúp bạn tập trung ôn luyện trọng tâm.
- Bảng xếp hạng thi đua: Tích điểm qua từng lượt làm bài để theo dõi tiến độ và so tài cùng cộng đồng.
- Kho tài liệu phong phú & Tải PDF miễn phí: Cung cấp đa dạng nội dung miễn phí lẫn trả phí; hỗ trợ tải đề kèm đáp án dạng PDF miễn phí để dễ dàng in ra giấy ôn tập.

## Công nghệ

- **Giao diện:** React, TypeScript, Vite và Tailwind CSS.
- **Deploy:** Vercel.
- **Backend:** Supabase Auth, Postgres, Storage và Edge Functions.
- **Lưu trữ dữ liệu:** Cloudflare R2.

Một số tài nguyên và cấu hình phục vụ phát triển hoặc vận hành được quản lý riêng, không nằm trong repo công khai. Nội dung cần phân quyền được phục vụ qua backend sau khi kiểm tra quyền truy cập.

## Yêu cầu

- Node.js 22 trở lên
- npm 10 trở lên

## Chạy ở môi trường local

Cài dependencies và khởi động máy chủ phát triển:

```bash
npm install
npm run dev
```

Ứng dụng cần cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` để kết nối Supabase. Có thể cấu hình `VITE_SUPABASE_PROXY_URL` nếu môi trường triển khai sử dụng proxy. Các biến bắt đầu bằng `VITE_` được đưa vào mã phía trình duyệt; không đặt khóa quản trị hoặc secret trong các biến này.

## Lệnh thường dùng

```bash
npm run dev            # chạy máy chủ phát triển
npm run typecheck      # kiểm tra kiểu TypeScript
npm run lint           # chạy Oxlint
npm run test           # chạy Vitest
npm run build          # kiểm tra kiểu TypeScript và build dist/
npm run preview        # xem thử bản build production
npm run clean          # xóa dist/
```

Việc kiểm tra dữ liệu nguồn được thực hiện riêng trong môi trường phát triển khi cần. Build production không phụ thuộc vào bản sao dữ liệu cục bộ.

## Cấu trúc mã nguồn

```text
src/
  app/          bố cục và điều hướng
  auth/         trạng thái đăng nhập
  data/         danh mục môn học và metadata
  features/     quiz, lịch sử, tải xuống, admin, hỗ trợ và thông báo
  pages/        các màn hình theo route
  lib/          Supabase client và tiện ích dùng chung
```

## Triển khai

Vercel chạy `npm run build` và phục vụ nội dung trong `dist/`. Cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong Project Settings của Vercel.

Supabase và Cloudflare R2 là các dịch vụ backend/lưu trữ riêng với bản build giao diện. Việc cập nhật schema, Edge Functions hoặc nội dung lưu trữ được thực hiện theo quy trình vận hành tương ứng; các bản sao và tài nguyên nội bộ được quản lý riêng.
