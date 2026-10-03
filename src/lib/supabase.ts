import { createClient } from "@supabase/supabase-js"

// VITE_SUPABASE_URL luôn là URL Supabase thật (https://<ref>.supabase.co).
//
// Same-origin proxy (bỏ CORS preflight — mỗi preflight là 1 dòng log edge
// phía Supabase):
// - Mặc định: mọi host https (deploy Vercel: apex/www/preview) dùng base
//   `${location.origin}/sb` qua rewrite trong vercel.json — luôn same-origin
//   nên trình duyệt không gửi preflight. Base bắt buộc tuyệt đối vì
//   supabase-js derive mọi URL con bằng `new URL(path, base)`.
// - Local dev (http/localhost): gọi thẳng Supabase (Vite dev không có /sb).
// - VITE_SUPABASE_PROXY_URL đè default: đặt absolute URL để ép dùng proxy
//   khác, hoặc "off" để tắt proxy dù đang chạy https (cần build lại).
// WebSocket realtime KHÔNG qua được proxy (Vercel không upgrade WS) nên luôn
// được trỏ thẳng về endpoint wss của Supabase bên dưới.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY")
}

const rawProxy = (import.meta.env.VITE_SUPABASE_PROXY_URL ?? "").trim()
const proxyUrl = rawProxy
  ? (rawProxy.toLowerCase() === "off" ? "" : rawProxy)
  : (typeof location !== "undefined" && location.protocol === "https:" ? `${location.origin}/sb` : "")

// storageKey của auth-js derive từ hostname của base URL (`sb-<host[0]>-auth-token`).
// Ghim theo hostname THẬT để bật proxy không làm mọi user bị logged-out.
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`

export const supabase = createClient(proxyUrl || supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
  },
})

if (proxyUrl) {
  // Vercel rewrite không proxy được WebSocket upgrade: đưa realtime về
  // endpoint wss trực tiếp của Supabase TRƯỚC khi channel nào connect.
  // endPointURL() được phoenix Socket derive từ this.endPoint tại thời điểm
  // connect, nên mutate trước connect là an toàn. Giữ runtime guard: nếu
  // cấu trúc nội bộ của supabase-js đổi trong tương lai, báo lỗi rõ thay vì
  // im lặng nối vào URL proxy không hoạt động.
  const wsUrl = `${supabaseUrl.replace(/^http/, "ws")}/realtime/v1`
  const adapter = (
    supabase.realtime as unknown as {
      socketAdapter?: { socket?: { endPoint?: string } } | null
    }
  ).socketAdapter
  if (adapter?.socket && typeof adapter.socket.endPoint === "string") {
    adapter.socket.endPoint = wsUrl
  } else {
    console.error(
      "[supabase] realtime endpoint override failed (internal shape changed); realtime sẽ không kết nối được qua proxy",
    )
  }
}
