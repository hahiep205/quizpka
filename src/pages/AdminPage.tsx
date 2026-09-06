import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import { Activity, Banknote, BarChart3, CheckCircle2, Clock3, Download, History, LayoutGrid, LogOut, Megaphone, RefreshCw, Search, Send, ShieldAlert, UserRound, Users, WalletCards, X, type LucideIcon } from "lucide-react"
import { MobileTabBar } from "@/components/MobileTabBar"
import brandLogo from "@/assets/logo.png"
import { useAuth } from "@/auth/AuthProvider"
import { DashboardStatCard, dashboardStatGridClass } from "@/components/DashboardStatCard"
import { Card } from "@/components/ui/card"
import { fetchAllAdminUsers } from "@/features/admin/api/adminUsers"
import { fetchAllActivityTimeline, fetchAllPracticeAttempts, fetchPracticeAttempts, fetchUserActivity } from "@/features/admin/api/adminActivity"
import { ACTIVITY_LABELS, parseActivityRows, parseAttemptRows, toAttemptsCsv, toTimelineCsv, type ActivityEvent, type ActivityEventType, type PracticeAttemptRow } from "@/features/activity/lib/activityLog"
import { bucketLast14Days, eventsByType, filterByDays, topLearners, topSubjects } from "@/features/admin/lib/adminOverview"
import { ANOMALY_META, detectAllAnomalies, detectUserAnomalies, riskScore, type AnomalyFlag, type AnomalySeverity } from "@/features/admin/lib/anomalyDetectors"
import { supabase } from "@/lib/supabase"
import {
  computeAdminKpis,
  downloadCsv,
  filterAdminUsers,
  filterByTab,
  sortAdminUsers,
  toAdminCsv,
  type AdminSortKey,
  type AdminTab,
  type AdminUser,
} from "@/features/admin/lib/adminStats"
import { appRoutes, getCurrentPath, navigate, type AppPath } from "@/app/navigation"
import { cn } from "@/lib/utils"
import { fetchAdminNotificationHistory, fetchNotificationRecipients, revokeAdminNotification, sendAdminNotifications, type AdminNotificationHistory, type NotificationRecipient } from "@/features/notifications/api/notifications"
import { fetchAllAdminPayments, type AdminPayment, type PaymentStatus } from "@/features/admin/api/adminPayments"
import { grantAdminPurchase, fetchAdminProducts, type AdminProduct } from "@/features/admin/api/adminEntitlements"
import { fetchSupportReports, updateSupportStatus, type SupportReport, type SupportStatus } from "@/features/support/api/supportReports"

function formatAdminDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatTime(v: string | null, lang: "vi" | "en"): string {
  if (!v) return "—"
  const t = Date.parse(v)
  if (!Number.isFinite(t)) return "—"
  return new Date(v).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = { paid: "Đã thanh toán", pending: "Đang chờ", failed: "Thất bại", refunded: "Đã hoàn tiền", canceled: "Đã hủy" }
  const tones: Record<PaymentStatus, string> = { paid: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300", pending: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300", failed: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300", refunded: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300", canceled: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300" }
  return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black", tones[status])}>{labels[status]}</span>
}

function toPaymentCsv(payments: AdminPayment[]): string {
  const header = ["order_id", "user_id", "product_id", "product_name", "amount_vnd", "status", "transaction_id", "paid_at", "created_at"]
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`
  return [header, ...payments.map((p) => [p.orderId, p.userId, p.productId, p.productName, p.amountVnd, p.status, p.transactionId, p.paidAt, p.createdAt])].map((row) => row.map(escape).join(",")).join("\n")
}

type Props = { lang: "vi" | "en" }
type AdminSection = "overview" | "users" | "notifications" | "payment" | "sendquiz" | "supports" | "timeline" | "attempts"

const tabs: Array<{ key: AdminTab; vi: string; en: string }> = [
  { key: "logined", vi: "Đã login", en: "Logined" },
  { key: "active-account", vi: "Active (tài khoản)", en: "Active account" },
  { key: "active-7d", vi: "Active 7 ngày", en: "Active 7d" },
  { key: "active-30d", vi: "Active 30 ngày", en: "Active 30d" },
]

const EVENT_FILTERS: Array<"all" | ActivityEventType> = ["all", "login", "open_exam", "start_attempt", "submit_attempt", "retry_wrong", "view_dashboard", "view_leaderboard", "update_profile"]

const EVENT_TONES: Record<ActivityEventType, string> = {
  login: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10",
  view_dashboard: "bg-sky-50 text-[#1CB0F6] dark:bg-sky-500/10",
  open_exam: "bg-amber-50 text-amber-500 dark:bg-amber-500/10",
  start_attempt: "bg-orange-50 text-orange-500 dark:bg-orange-500/10",
  submit_attempt: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10",
  retry_wrong: "bg-violet-50 text-violet-500 dark:bg-violet-500/10",
  view_leaderboard: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10",
  update_profile: "bg-slate-100 text-slate-500 dark:bg-white/10",
}

const RANGE_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 7, label: "7 ngày" },
  { days: 14, label: "14 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
  { days: 0, label: "Tất cả" },
]

const SECTION_NAV: Array<{ key: AdminSection; icon: LucideIcon; vi: string; en: string }> = [
  { key: "overview", icon: LayoutGrid, vi: "Tổng quan", en: "Overview" },
  { key: "users", icon: Users, vi: "Người dùng", en: "Users" },
  { key: "notifications", icon: Megaphone, vi: "Thông báo", en: "Notifications" },
  { key: "payment", icon: WalletCards, vi: "Giao dịch", en: "Payments" },
  { key: "sendquiz", icon: Send, vi: "Cấp môn học", en: "Grant access" },
  { key: "supports", icon: ShieldAlert, vi: "Báo lỗi", en: "Support" },
  { key: "timeline", icon: Activity, vi: "Luồng HĐ", en: "Timeline" },
  { key: "attempts", icon: History, vi: "Lịch sử", en: "History" },
]

const SECTION_PATHS: Record<AdminSection, AppPath> = {
  overview: appRoutes.adminOverview,
  users: appRoutes.adminUsers,
  notifications: appRoutes.adminNotifications,
  payment: appRoutes.adminPayment,
  sendquiz: appRoutes.adminSendQuiz,
  supports: appRoutes.adminSupports,
  timeline: appRoutes.adminTimeline,
  attempts: appRoutes.adminAttempts,
}

function getAdminView(path: string): AdminSection {
  if (path === appRoutes.adminUsers) return "users"
  if (path === appRoutes.adminNotifications) return "notifications"
  if (path === appRoutes.adminPayment) return "payment"
  if (path === appRoutes.adminSendQuiz) return "sendquiz"
  if (path === appRoutes.adminSupports) return "supports"
  if (path === appRoutes.adminTimeline) return "timeline"
  if (path === appRoutes.adminAttempts) return "attempts"
  return "overview"
}

const USER_PAGE_SIZE = 15
const TIMELINE_PAGE_SIZE = 20
const ATTEMPTS_PAGE_SIZE = 20
const PAYMENT_PAGE_SIZE = 20

export function AdminPage({ lang }: Props) {
  const { profile, signOut } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userCounts, setUserCounts] = useState({ total: 0, active: 0, blocked: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>("logined")
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<"all" | "user" | "admin">("all")
  const [status, setStatus] = useState<"all" | "active" | "blocked">("all")
  const [sortKey, setSortKey] = useState<AdminSortKey | "risk">("lastActive")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipient[]>([])
  const [notificationRecipientQuery, setNotificationRecipientQuery] = useState("")
  const [notificationTitle, setNotificationTitle] = useState("")
  const [notificationMessage, setNotificationMessage] = useState("")
  const [notificationRecipientIds, setNotificationRecipientIds] = useState<string[]>([])
  const [notificationSending, setNotificationSending] = useState(false)
  const [notificationResult, setNotificationResult] = useState<string | null>(null)
  const [notificationHistory, setNotificationHistory] = useState<AdminNotificationHistory[]>([])
  const [selectedNotification, setSelectedNotification] = useState<AdminNotificationHistory | null>(null)
  const [revokingNotificationId, setRevokingNotificationId] = useState<number | null>(null)
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [paymentQuery, setPaymentQuery] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<"all" | PaymentStatus>("all")
  const [paymentPage, setPaymentPage] = useState(0)
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([])
  const [grantUserId, setGrantUserId] = useState("")
  const [grantUserQuery, setGrantUserQuery] = useState("")
  const [grantProductId, setGrantProductId] = useState("")
  const [grantSending, setGrantSending] = useState(false)
  const [grantResult, setGrantResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [supportReports, setSupportReports] = useState<SupportReport[]>([])
  const [supportsError, setSupportsError] = useState<string | null>(null)
  const [supportQuery, setSupportQuery] = useState("")
  const [supportStatus, setSupportStatus] = useState<"all" | SupportStatus>("all")
  const [updatingSupportId, setUpdatingSupportId] = useState<string | null>(null)

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<PracticeAttemptRow[]>([])
  const [attemptsError, setAttemptsError] = useState<string | null>(null)
  const [eventFilter, setEventFilter] = useState<"all" | ActivityEventType>("all")
  const [timelineQuery, setTimelineQuery] = useState("")
  const [rangeDays, setRangeDays] = useState(14)
  const [page, setPage] = useState(0)
  const [timelinePage, setTimelinePage] = useState(0)
  const [attemptsPage, setAttemptsPage] = useState(0)
  const [live, setLive] = useState(false)
  const [section, setSection] = useState<AdminSection>(() => getAdminView(getCurrentPath()))
  const [onlyAnomaly, setOnlyAnomaly] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
      void fetchAllAdminUsers().then((res) => {
      if (!mountedRef.current) return
       setUsers(res.users)
       setUserCounts({ total: res.totalUsers, active: res.activeUsers, blocked: res.blockedUsers })
      setError(res.ok ? null : res.error)
      setLoading(false)
    })
     void fetchAllActivityTimeline().then((res) => {
      if (!mountedRef.current) return
      setEvents(res.events)
      setEventsError(res.ok ? null : res.error)
    })
     void fetchAllPracticeAttempts().then((res) => {
      if (!mountedRef.current) return
      setAttempts(res.attempts)
      setAttemptsError(res.ok ? null : res.error)
     })
     void fetchAdminNotificationHistory().then(setNotificationHistory).catch(() => setNotificationHistory([]))
     void fetchAllAdminPayments().then((res) => {
       if (!mountedRef.current) return
       setPayments(res.payments)
       setPaymentsError(res.ok ? null : res.error)
     })
  }, [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    void fetchNotificationRecipients().then(setNotificationRecipients).catch(() => setNotificationRecipients([]))
    void fetchAdminProducts().then(setAdminProducts).catch(() => setAdminProducts([]))
    void fetchSupportReports().then((reports) => { setSupportReports(reports); setSupportsError(null) }).catch((error: unknown) => setSupportsError(error instanceof Error ? error.message : "Không đọc được báo lỗi."))
  }, [])

  // Đồng bộ tab đang xem với URL (back/forward, link trực tiếp /admin/users...).
  useEffect(() => {
    const syncView = () => setSection(getAdminView(getCurrentPath()))
    window.addEventListener("popstate", syncView)
    return () => window.removeEventListener("popstate", syncView)
  }, [])

  // /admin trần -> canonical /admin/overview
  useEffect(() => {
    if (getCurrentPath() === appRoutes.admin) navigate(appRoutes.adminOverview, { replace: true })
  }, [])

  // Realtime: prepend event/attempt mới khi đang mở /admin (optional, im lặng khi tắt).
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel("admin-observability")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_activity_events" }, (payload) => {
          const rows = parseActivityRows([payload.new])
          if (rows.length) setEvents((prev) => [...rows, ...prev].slice(0, 2000))
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "practice_attempts" }, (payload) => {
          const rows = parseAttemptRows([payload.new])
          if (rows.length) setAttempts((prev) => [...rows, ...prev].slice(0, 2000))
        })
        .subscribe((s) => setLive(s === "SUBSCRIBED"))
    } catch {
      // Realtime chưa bật hoặc mất mạng -> admin vẫn dùng được với nút reload.
    }
    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  // Reset về trang 1 mỗi khi đổi filter/tab/sort.
  useEffect(() => { setPage(0) }, [tab, query, role, status, sortKey, sortDir])
  useEffect(() => { setTimelinePage(0) }, [eventFilter, timelineQuery, onlyAnomaly, rangeDays, section])
  useEffect(() => { setAttemptsPage(0) }, [onlyAnomaly, rangeDays, section])
  useEffect(() => { setPaymentPage(0) }, [paymentQuery, paymentStatus])

  const kpis = useMemo(() => ({ ...computeAdminKpis(users), totalLogined: userCounts.total, activeAccount: userCounts.active, blockedAccount: userCounts.blocked }), [userCounts, users])
  const tabCounts = useMemo(() => ({
    logined: filterByTab(users, "logined").length,
    "active-account": filterByTab(users, "active-account").length,
    "active-7d": filterByTab(users, "active-7d").length,
    "active-30d": filterByTab(users, "active-30d").length,
  }), [users])

  // Flags bất thường trên toàn bộ dữ liệu đã tải (A1/A2/A3/A6/A7).
  const allFlags = useMemo(() => detectAllAnomalies(attempts, events), [attempts, events])
  const flagCountByUser = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of allFlags) m.set(f.userId, (m.get(f.userId) ?? 0) + 1)
    return m
  }, [allFlags])
  const flagsByEventId = useMemo(() => {
    const m = new Map<number, AnomalyFlag[]>()
    for (const f of allFlags) for (const id of f.evidence.eventIds ?? []) {
      const list = m.get(id) ?? []
      list.push(f)
      m.set(id, list)
    }
    return m
  }, [allFlags])
  const flagsByAttemptKey = useMemo(() => {
    const m = new Map<string, AnomalyFlag[]>()
    for (const f of allFlags) for (const hid of f.evidence.historyIds ?? []) {
      const key = `${f.userId}:${hid}`
      const list = m.get(key) ?? []
      list.push(f)
      m.set(key, list)
    }
    return m
  }, [allFlags])
  const anomalyUserCount = flagCountByUser.size

  const visible = useMemo(() => {
    const byTab = filterByTab(users, tab)
    const byFilter = filterAdminUsers(byTab, { query, role, status })
    if (sortKey === "risk") {
      return [...byFilter].sort((a, b) =>
        (flagCountByUser.get(b.id) ?? 0) - (flagCountByUser.get(a.id) ?? 0)
        || Date.parse(b.lastActiveAt ?? "") - Date.parse(a.lastActiveAt ?? ""),
      )
    }
    return sortAdminUsers(byFilter, sortKey, sortDir)
  }, [flagCountByUser, query, role, sortDir, sortKey, status, tab, users])

  const pageCount = Math.max(1, Math.ceil(visible.length / USER_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pagedUsers = useMemo(
    () => visible.slice(safePage * USER_PAGE_SIZE, safePage * USER_PAGE_SIZE + USER_PAGE_SIZE),
    [safePage, visible],
  )

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.displayName ?? u.email ?? u.id.slice(0, 8))
    return m
  }, [users])

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const filteredPayments = useMemo(() => {
    const q = paymentQuery.trim().toLowerCase()
    return payments.filter((payment) => {
      if (paymentStatus !== "all" && payment.status !== paymentStatus) return false
      if (!q) return true
      const user = userById.get(payment.userId)
      return [payment.orderId, payment.transactionId, payment.productName, payment.productId, payment.userId, user?.displayName, user?.email]
        .some((value) => value?.toLowerCase().includes(q))
    })
  }, [paymentQuery, paymentStatus, payments, userById])
  const paymentKpis = useMemo(() => ({
    revenue: payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amountVnd, 0),
    paid: payments.filter((payment) => payment.status === "paid").length,
    pending: payments.filter((payment) => payment.status === "pending").length,
    unsuccessful: payments.filter((payment) => ["failed", "refunded", "canceled"].includes(payment.status)).length,
  }), [payments])
  const paymentPageCount = Math.max(1, Math.ceil(filteredPayments.length / PAYMENT_PAGE_SIZE))
  const safePaymentPage = Math.min(paymentPage, paymentPageCount - 1)
  const pagedPayments = useMemo(() => filteredPayments.slice(safePaymentPage * PAYMENT_PAGE_SIZE, safePaymentPage * PAYMENT_PAGE_SIZE + PAYMENT_PAGE_SIZE), [filteredPayments, safePaymentPage])

  // Khoảng ngày áp dụng chung cho overview + timeline + bảng attempts.
  const rangedEvents = useMemo(() => filterByDays(events, (e) => e.createdAt, rangeDays), [events, rangeDays])
  const rangedAttempts = useMemo(() => filterByDays(attempts, (a) => a.completedAt, rangeDays), [attempts, rangeDays])

  const filteredEvents = useMemo(() => {
    const q = timelineQuery.trim().toLowerCase()
    return rangedEvents.filter((e) => {
      if (eventFilter !== "all" && e.eventType !== eventFilter) return false
      if (onlyAnomaly && !flagsByEventId.has(e.id)) return false
      if (!q) return true
      const name = (nameById.get(e.userId) ?? e.userId).toLowerCase()
      return name.includes(q) || e.userId.toLowerCase().includes(q)
    })
  }, [eventFilter, flagsByEventId, onlyAnomaly, rangedEvents, nameById, timelineQuery])

  const timelinePageCount = Math.max(1, Math.ceil(filteredEvents.length / TIMELINE_PAGE_SIZE))
  const safeTimelinePage = Math.min(timelinePage, timelinePageCount - 1)
  const pagedEvents = useMemo(
    () => filteredEvents.slice(safeTimelinePage * TIMELINE_PAGE_SIZE, safeTimelinePage * TIMELINE_PAGE_SIZE + TIMELINE_PAGE_SIZE),
    [safeTimelinePage, filteredEvents],
  )

  const visibleFlags = useMemo(() => {
    const q = timelineQuery.trim().toLowerCase()
    return filterByDays(allFlags, (f) => f.createdAt, rangeDays)
      .filter((f) => {
        if (!q) return true
        const name = (nameById.get(f.userId) ?? f.userId).toLowerCase()
        return name.includes(q) || f.userId.toLowerCase().includes(q)
      })
      .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
  }, [allFlags, nameById, rangeDays, timelineQuery])

  const visibleAttempts = useMemo(() => {
    if (!onlyAnomaly) return rangedAttempts
    return rangedAttempts.filter((a) => flagsByAttemptKey.has(`${a.userId}:${a.historyId}`))
  }, [flagsByAttemptKey, onlyAnomaly, rangedAttempts])

  const attemptsPageCount = Math.max(1, Math.ceil(visibleAttempts.length / ATTEMPTS_PAGE_SIZE))
  const safeAttemptsPage = Math.min(attemptsPage, attemptsPageCount - 1)
  const pagedAttempts = useMemo(
    () => visibleAttempts.slice(safeAttemptsPage * ATTEMPTS_PAGE_SIZE, safeAttemptsPage * ATTEMPTS_PAGE_SIZE + ATTEMPTS_PAGE_SIZE),
    [safeAttemptsPage, visibleAttempts],
  )

  const chartDays = rangeDays === 0 ? 30 : Math.min(rangeDays, 30)
  const dayBuckets = useMemo(() => bucketLast14Days(rangedAttempts, rangedEvents, undefined, chartDays), [rangedAttempts, rangedEvents, chartDays])
  const dayMax = useMemo(() => Math.max(1, ...dayBuckets.map((b) => Math.max(b.attempts, b.events))), [dayBuckets])
  const evTypeCounts = useMemo(() => eventsByType(rangedEvents), [rangedEvents])
  const evTypeMax = useMemo(() => Math.max(1, ...evTypeCounts.map((c) => c.count)), [evTypeCounts])
  const subjectTops = useMemo(() => topSubjects(rangedAttempts), [rangedAttempts])
  const learnerTops = useMemo(() => topLearners(rangedAttempts), [rangedAttempts])

  const selected = users.find((u) => u.id === selectedId) ?? null

  const goSection = (key: AdminSection) => {
    setSection(key)
    navigate(SECTION_PATHS[key])
    window.scrollTo({ top: 0 })
  }

  const handleSignOut = () => { void signOut().then(() => navigate(appRoutes.home, { replace: true })) }

  const handleSendNotification = () => {
    setNotificationResult(null)
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      setNotificationResult("Vui lòng nhập đủ tiêu đề và nội dung.")
      return
    }
    setNotificationSending(true)
    void sendAdminNotifications({ title: notificationTitle, message: notificationMessage, recipientIds: notificationRecipientIds })
      .then((count) => { setNotificationResult(`Đã gửi thông báo tới ${count} user.`); setNotificationTitle(""); setNotificationMessage(""); setNotificationRecipientIds([]); return fetchAdminNotificationHistory() })
      .then(setNotificationHistory)
      .catch((err: unknown) => setNotificationResult(err instanceof Error ? err.message : "Không thể gửi thông báo."))
      .finally(() => setNotificationSending(false))
  }

  const handleRevokeNotification = (notification: AdminNotificationHistory) => {
    if (notification.revokedAt || !window.confirm(`Thu hồi thông báo này khỏi ${notification.recipientCount} user?`)) return
    setRevokingNotificationId(notification.id)
    void revokeAdminNotification(notification.id).then(() => fetchAdminNotificationHistory()).then(setNotificationHistory).catch((err: unknown) => setNotificationResult(err instanceof Error ? err.message : "Không thể thu hồi thông báo.")).finally(() => setRevokingNotificationId(null))
  }

  const handleGrantPurchase = () => {
    setGrantResult(null)
    if (!grantUserId || !grantProductId) {
      setGrantResult({ ok: false, message: "Vui lòng chọn user và môn học." })
      return
    }
    if (!window.confirm("Xác nhận đánh dấu user này đã mua môn học? Thao tác sẽ cấp quyền truy cập ngay lập tức.")) return
    setGrantSending(true)
    void grantAdminPurchase({ userId: grantUserId, productId: grantProductId })
      .then((result) => {
        setGrantResult({ ok: true, message: result.alreadyGranted ? "User đã có quyền môn học này. Không có thay đổi mới." : "Đã cấp quyền truy cập môn học cho user." })
        return fetchAllAdminPayments()
      })
      .then((result) => { setPayments(result.payments); setPaymentsError(result.ok ? null : result.error) })
      .catch((err: unknown) => setGrantResult({ ok: false, message: err instanceof Error ? err.message : "Không thể cấp quyền môn học." }))
      .finally(() => setGrantSending(false))
  }

  const filteredNotificationRecipients = notificationRecipients.filter((recipient) => {
    const query = notificationRecipientQuery.trim().toLowerCase()
    if (!query) return true
    return [recipient.displayName, recipient.email, recipient.id].some((value) => value?.toLowerCase().includes(query))
  })

  const filteredSupportReports = supportReports.filter((report) => {
    if (supportStatus !== "all" && report.status !== supportStatus) return false
    const query = supportQuery.trim().toLowerCase()
    if (!query) return true
    return [report.subject, report.description, report.displayName, report.email, report.userId].some((value) => value?.toLowerCase().includes(query))
  })

  const handleSupportStatus = (reportId: string, status: SupportStatus) => {
    setUpdatingSupportId(reportId)
    void updateSupportStatus(reportId, status)
      .then(() => setSupportReports((reports) => reports.map((report) => report.id === reportId ? { ...report, status, updatedAt: new Date().toISOString() } : report)))
      .catch((error: unknown) => setSupportsError(error instanceof Error ? error.message : "Không thể cập nhật báo lỗi."))
      .finally(() => setUpdatingSupportId(null))
  }

  const grantUsers = users.filter((user) => {
    if (user.role === "admin") return false
    const query = grantUserQuery.trim().toLowerCase()
    if (!query) return true
    return [user.displayName, user.email, user.id].some((value) => value?.toLowerCase().includes(query))
  })

  return (
    <div className="min-h-svh bg-[#F6F7FB] text-[#100F3E] transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <AdminSidebar lang={lang} section={section} live={live} profileName={profile?.display_name ?? profile?.email ?? null} profileEmail={profile?.email ?? null} avatarUrl={profile?.avatar_url ?? null} onNavigate={goSection} onSignOut={handleSignOut} />

      <div className="lg:pl-[200px]">
        <AdminTopbar lang={lang} profileName={profile?.display_name ?? null} live={live} onReload={reload} reloading={loading} onSignOut={handleSignOut} />

        <main className="mx-auto w-full max-w-[1440px] space-y-6 px-3 pb-[calc(108px+env(safe-area-inset-bottom))] pt-4 min-[380px]:px-4 sm:space-y-8 sm:px-6 sm:pt-6 md:px-8 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
           <div className="dashboard-reveal space-y-6 sm:space-y-8">
            {error ? (
              <div className="rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 shadow-[0_3px_0_#f5d78e] sm:rounded-[20px] sm:p-5 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:shadow-none">
                <p className="font-black">Chưa đọc được full data: {error}</p>
                <p className="mt-1">Hãy chạy file <code>supabase/migrations/*_admin_read.sql</code> trong Supabase SQL editor để mở policy cho role=admin.</p>
              </div>
            ) : null}
            {section === "notifications" ? (
            <section className="scroll-mt-24 space-y-4 sm:space-y-5">
              <AdminSectionHeading icon={Megaphone} title={lang === "vi" ? "Gửi thông báo" : "Send notifications"} description={lang === "vi" ? "Gửi tới tất cả user đang hoạt động hoặc một user được chọn" : "Send to all active users or one selected user"} />
              <Card className="max-w-3xl space-y-5 p-5 sm:p-6">
                <div>
                  <label className="text-sm font-black">Đối tượng nhận</label>
                  <label className="relative mt-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={notificationRecipientQuery} onChange={(e) => setNotificationRecipientQuery(e.target.value)} placeholder="Tìm theo tên, email hoặc ID..." className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" />
                  </label>
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border-2 border-[#E5E5E5] bg-white p-2 dark:border-white/10 dark:bg-slate-800">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-black hover:bg-sky-50 dark:hover:bg-white/5">
                      <input type="checkbox" checked={notificationRecipientIds.length === 0} onChange={() => setNotificationRecipientIds([])} className="h-4 w-4 accent-[#1CB0F6]" />
                      Tất cả user active ({notificationRecipients.length})
                    </label>
                    {filteredNotificationRecipients.map((u) => <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-sky-50 dark:hover:bg-white/5"><input type="checkbox" checked={notificationRecipientIds.includes(u.id)} onChange={() => setNotificationRecipientIds((current) => current.includes(u.id) ? current.filter((id) => id !== u.id) : [...current, u.id])} className="h-4 w-4 accent-[#1CB0F6]" /><span className="min-w-0 truncate">{u.displayName ?? "(chưa đặt tên)"} <span className="text-xs text-slate-400">· {u.email ?? u.id.slice(0, 8)}</span></span></label>)}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{notificationRecipientIds.length ? `Đã chọn ${notificationRecipientIds.length} user` : `Tất cả user active (${notificationRecipients.length})`} · Hiển thị {filteredNotificationRecipients.length}/{notificationRecipients.length}</p>
                </div>
                <div>
                  <label htmlFor="notification-title" className="text-sm font-black">Tiêu đề</label>
                  <input id="notification-title" maxLength={120} value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} placeholder="Ví dụ: Lịch thi sắp tới" className="mt-2 h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-bold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" />
                  <p className="mt-1 text-right text-xs font-semibold text-slate-400">{notificationTitle.length}/120</p>
                </div>
                <div>
                  <label htmlFor="notification-message" className="text-sm font-black">Nội dung</label>
                  <textarea id="notification-message" maxLength={2000} rows={6} value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} placeholder="Nhập nội dung thông báo..." className="mt-2 w-full resize-y rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" />
                  <p className="mt-1 text-right text-xs font-semibold text-slate-400">{notificationMessage.length}/2000</p>
                </div>
                {notificationResult ? <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{notificationResult}</p> : null}
                <button type="button" disabled={notificationSending} onClick={handleSendNotification} className="lp-btn lp-btn--primary"><Send className="h-4 w-4" />{notificationSending ? "Đang gửi..." : "Gửi thông báo"}</button>
              </Card>
              <div className="space-y-3">
                <AdminSectionHeading icon={History} title="Lịch sử đã gửi" description="Các thông báo đã gửi tới user, bao gồm cả thông báo broadcast và gửi riêng" />
                {notificationHistory.length ? notificationHistory.map((notification) => (
                  <Card key={notification.id} onClick={() => setSelectedNotification(notification)} className={cn("flex cursor-pointer flex-col gap-4 p-4 transition hover:-translate-y-px hover:border-[#7DD3FC] sm:flex-row sm:items-start sm:justify-between sm:p-5", notification.revokedAt && "opacity-60")}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-[#100F3E] dark:text-white">{notification.title}</h3><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", notification.isDirect ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300")}>{notification.isDirect ? "Gửi riêng" : "Tất cả user"}</span>{notification.revokedAt ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-300">Đã thu hồi</span> : null}</div>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-600 dark:text-slate-300">{notification.message}</p>
                      <p className="mt-2 text-xs font-bold text-slate-400">{notification.recipientCount} user · {formatTime(notification.createdAt, lang)}</p>
                    </div>
                    {!notification.revokedAt ? <button type="button" disabled={revokingNotificationId === notification.id} onClick={(event) => { event.stopPropagation(); handleRevokeNotification(notification) }} className="lp-btn lp-btn--secondary lp-btn--sm shrink-0 text-red-600">{revokingNotificationId === notification.id ? "Đang thu hồi..." : "Thu hồi"}</button> : null}
                  </Card>
                )) : <Card variant="dashed" className="py-10 text-center"><p className="text-sm font-bold text-slate-500">Chưa có lịch sử thông báo.</p></Card>}
              </div>
            </section>
            ) : null}

             {section === "payment" ? (
            <section className="scroll-mt-24 space-y-4 sm:space-y-5">
              <AdminSectionHeading icon={WalletCards} title={lang === "vi" ? "Giao dịch" : "Payments"} description={lang === "vi" ? "Theo dõi toàn bộ đơn hàng và giao dịch mua môn học trả phí của user" : "Track all paid course orders and user transactions"} action={payments.length ? <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" onClick={() => downloadCsv(`admin-payments-${new Date().toISOString().slice(0, 10)}.csv`, toPaymentCsv(filteredPayments))}><Download className="h-4 w-4" />CSV</button> : undefined} />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <DashboardStatCard icon={Banknote} value={formatVnd(paymentKpis.revenue)} label="Doanh thu đã thu" tone="green" />
                <DashboardStatCard icon={CheckCircle2} value={String(paymentKpis.paid)} label="Giao dịch thành công" tone="blue" />
                <DashboardStatCard icon={Clock3} value={String(paymentKpis.pending)} label="Đang chờ thanh toán" tone="orange" />
                <DashboardStatCard icon={ShieldAlert} value={String(paymentKpis.unsuccessful)} label="Thất bại / hoàn tiền" tone="violet" />
              </div>
              <Card className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="relative block flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={paymentQuery} onChange={(e) => setPaymentQuery(e.target.value)} placeholder="Tìm tên, email, mã đơn hoặc mã giao dịch..." className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" /></label>
                  <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)} className="h-11 rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-bold outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"><option value="all">Tất cả trạng thái</option><option value="paid">Đã thanh toán</option><option value="pending">Đang chờ</option><option value="failed">Thất bại</option><option value="refunded">Đã hoàn tiền</option><option value="canceled">Đã hủy</option></select>
                </div>
                <p className="text-xs font-semibold text-slate-400">Hiển thị {filteredPayments.length}/{payments.length} giao dịch</p>
              </Card>
              {paymentsError ? <Card variant="dashed" className="p-5 text-sm font-bold text-red-600">{paymentsError}</Card> : null}
              {!paymentsError && !filteredPayments.length ? <Card variant="dashed" className="py-14 text-center"><WalletCards className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">Chưa có giao dịch phù hợp.</p></Card> : null}
              {pagedPayments.length ? <div className="overflow-x-auto rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:bg-white/5"><th className="px-4 py-3">User</th><th className="px-4 py-3">Môn học</th><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3 text-right">Số tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thời gian</th></tr></thead><tbody>{pagedPayments.map((payment) => { const user = userById.get(payment.userId); return <tr key={payment.orderId} className="border-t border-slate-100 dark:border-white/5"><td className="px-4 py-3"><p className="font-extrabold text-[#100F3E] dark:text-white">{user?.displayName ?? "(chưa đặt tên)"}</p><p className="text-xs font-semibold text-slate-400">{user?.email ?? payment.userId}</p></td><td className="max-w-[240px] px-4 py-3 font-bold text-slate-600 dark:text-slate-300">{payment.productName}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{payment.orderId}<span className="block text-[10px] text-slate-400">{payment.transactionId ?? "Chưa có mã giao dịch"}</span></td><td className="px-4 py-3 text-right font-black text-[#129BDC]">{formatVnd(payment.amountVnd)}</td><td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td><td className="px-4 py-3 text-xs font-semibold text-slate-400">{formatTime(payment.paidAt ?? payment.createdAt, lang)}</td></tr> })}</tbody></table></div> : null}
              {filteredPayments.length > PAYMENT_PAGE_SIZE ? <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-400">Hiển thị {safePaymentPage * PAYMENT_PAGE_SIZE + 1}–{Math.min(filteredPayments.length, safePaymentPage * PAYMENT_PAGE_SIZE + PAYMENT_PAGE_SIZE)} / {filteredPayments.length}</p><div className="flex gap-2"><button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safePaymentPage === 0} onClick={() => setPaymentPage(safePaymentPage - 1)}>← Trước</button><button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safePaymentPage >= paymentPageCount - 1} onClick={() => setPaymentPage(safePaymentPage + 1)}>Sau →</button></div></div> : null}
            </section>
             ) : null}

             {section === "sendquiz" ? (
             <section className="scroll-mt-24 space-y-4 sm:space-y-5">
               <AdminSectionHeading icon={Send} title="Cấp quyền môn học" description="Xử lý trường hợp user đã thanh toán thành công nhưng hệ thống chưa ghi nhận quyền truy cập" />
               <Card className="max-w-3xl space-y-5 p-5 sm:p-6">
                 <div className="rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                   Chỉ sử dụng sau khi đã đối soát thanh toán. Thao tác này ghi nhận quyền mua trực tiếp, không tạo doanh thu hoặc giao dịch thanh toán mới.
                 </div>
                 <div>
                   <label htmlFor="grant-user" className="text-sm font-black">User nhận quyền</label>
                   <label className="relative mt-2 block">
                     <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                     <input value={grantUserQuery} onChange={(e) => setGrantUserQuery(e.target.value)} placeholder="Tìm theo tên, email hoặc ID..." className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" />
                   </label>
                   <select id="grant-user" value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-bold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white">
                     <option value="">Chọn user...</option>
                     {grantUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName ?? "(chưa đặt tên)"} · {user.email ?? user.id}</option>)}
                   </select>
                   <p className="mt-1 text-xs font-semibold text-slate-400">Hiển thị {grantUsers.length}/{users.filter((user) => user.role !== "admin").length} user.</p>
                 </div>
                 <div>
                   <label htmlFor="grant-product" className="text-sm font-black">Môn học trả phí</label>
                   <select id="grant-product" value={grantProductId} onChange={(e) => setGrantProductId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-bold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white">
                     <option value="">Chọn môn học...</option>
                     {adminProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatVnd(product.priceVnd)}</option>)}
                   </select>
                 </div>
                 {grantResult ? <p className={cn("rounded-xl px-3 py-2 text-sm font-bold", grantResult.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300")}>{grantResult.message}</p> : null}
                 <button type="button" disabled={grantSending || !grantUserId || !grantProductId} onClick={handleGrantPurchase} className="lp-btn lp-btn--primary"><Send className="h-4 w-4" />{grantSending ? "Đang cấp quyền..." : "Đánh dấu đã mua và cấp quyền"}</button>
               </Card>
             </section>
             ) : null}

             {section === "supports" ? (
             <section className="scroll-mt-24 space-y-4 sm:space-y-5">
               <AdminSectionHeading icon={ShieldAlert} title="Báo lỗi từ user" description="Theo dõi và cập nhật trạng thái các lỗi được người dùng gửi" />
               <Card className="space-y-3 p-4 sm:p-5">
                 <div className="flex flex-col gap-3 sm:flex-row">
                   <label className="relative block flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={supportQuery} onChange={(event) => setSupportQuery(event.target.value)} placeholder="Tìm tiêu đề, nội dung, tên, email hoặc ID..." className="h-11 w-full rounded-xl border-2 border-[#E5E5E5] bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white" /></label>
                   <select value={supportStatus} onChange={(event) => setSupportStatus(event.target.value as typeof supportStatus)} className="h-11 rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-bold outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"><option value="all">Tất cả trạng thái</option><option value="pending">Đang chờ</option><option value="resolved">Đã xử lý</option><option value="unresolvable">Không xử lý được</option></select>
                 </div>
                 <p className="text-xs font-semibold text-slate-400">Hiển thị {filteredSupportReports.length}/{supportReports.length} báo lỗi</p>
               </Card>
               {supportsError ? <Card variant="dashed" className="p-5 text-sm font-bold text-red-600">{supportsError}</Card> : null}
               {filteredSupportReports.length ? filteredSupportReports.map((report) => (
                 <Card key={report.id} className="space-y-3 p-4 sm:p-5">
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="text-base font-black text-[#100F3E] dark:text-white">{report.subject}</h3><p className="mt-1 text-xs font-semibold text-slate-400">{report.displayName ?? "(chưa đặt tên)"} · {report.email ?? report.userId} · {formatTime(report.createdAt, lang)}</p></div><select value={report.status} disabled={updatingSupportId === report.id} onChange={(event) => handleSupportStatus(report.id, event.target.value as SupportStatus)} className="h-10 rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-xs font-black outline-none focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white"><option value="pending">Đang chờ</option><option value="resolved">Đã xử lý</option><option value="unresolvable">Không xử lý được</option></select></div>
                   <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{report.description}</p>
                   {report.pageUrl?.startsWith("https://") || report.pageUrl?.startsWith("http://") ? <a href={report.pageUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-bold text-[#129BDC] hover:underline">Trang báo lỗi: {report.pageUrl}</a> : null}
                 </Card>
               )) : <Card variant="dashed" className="py-14 text-center"><ShieldAlert className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">Chưa có báo lỗi phù hợp.</p></Card>}
             </section>
             ) : null}

             {section === "overview" ? (
            <>
            <section className={dashboardStatGridClass} aria-label="Statistics">
              <DashboardStatCard icon={Users} value={String(kpis.totalLogined)} label={lang === "vi" ? `Logined (active acc: ${kpis.activeAccount})` : `Logined (active: ${kpis.activeAccount})`} tone="blue" />
              <DashboardStatCard icon={UserRound} value={String(kpis.newToday)} label={lang === "vi" ? "User mới hôm nay" : "New users today"} tone="orange" />
              <DashboardStatCard icon={CheckCircle2} value={String(kpis.totalAttempts)} label={lang === "vi" ? `Lượt làm (TB ${kpis.avgAccuracy}%)` : `Attempts (avg ${kpis.avgAccuracy}%)`} tone="green" />
              <DashboardStatCard icon={Clock3} value={formatAdminDuration(kpis.totalDurationSeconds)} label={lang === "vi" ? `Tổng giờ học (mới 7d: ${kpis.new7d})` : `Study time (new 7d: ${kpis.new7d})`} tone="violet" />
            </section>

            {kpis.blockedAccount > 0 ? (
              <p className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400"><ShieldAlert className="h-4 w-4" />Blocked: {kpis.blockedAccount} — vẫn hiện ở tab Logined, ẩn ở các tab Active.</p>
            ) : null}

            {/* Tổng quan */}
            <section id="admin-overview" className="scroll-mt-24 space-y-4 sm:space-y-5">
              <AdminSectionHeading
                icon={BarChart3}
                title={lang === "vi" ? `Tổng quan ${rangeDays === 0 ? "tất cả" : `${chartDays} ngày`}` : `Overview ${rangeDays === 0 ? "(all)" : `${chartDays}d`}`}
                description={lang === "vi" ? "Nhịp độ học tập, phễu sự kiện, top môn và top learner" : "Learning pace, event funnel, top subjects and learners"}
              />
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r.days}
                    type="button"
                    onClick={() => setRangeDays(r.days)}
                    className={cn("lp-chip min-h-10 justify-center px-3 text-xs sm:px-4 sm:text-sm", rangeDays === r.days && "is-active")}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
                <div className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] lg:col-span-3 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Lượt nộp bài + events theo ngày</p>
                    <div className="ml-auto flex items-center gap-3 text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1CB0F6]" />Nộp bài</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />Events</span>
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto pb-1">
                    <div className="flex h-36 min-w-[520px] items-end gap-1 sm:h-40 sm:gap-1.5">
                    {dayBuckets.map((b) => (
                      <div key={b.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${b.label}: ${b.attempts} lượt nộp, ${b.events} events`}>
                        <div className="flex h-28 w-full items-end justify-center gap-1 sm:h-32">
                          <div className="w-full max-w-3.5 rounded-t-full bg-[#1CB0F6]" style={{ height: `${Math.max(4, Math.round((b.attempts / dayMax) * 100))}%`, opacity: b.attempts ? 1 : 0.25 }} />
                          <div className="w-full max-w-3.5 rounded-t-full bg-slate-300 dark:bg-slate-600" style={{ height: `${Math.max(4, Math.round((b.events / dayMax) * 100))}%`, opacity: b.events ? 1 : 0.25 }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 sm:text-[10px]">{b.label.slice(0, 2)}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] lg:col-span-2 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Events theo loại</p>
                  {evTypeCounts.length ? evTypeCounts.map((c) => (
                    <div key={c.key} className="flex items-center gap-2.5 text-xs font-bold">
                      <span className="w-28 shrink-0 truncate text-slate-600 sm:w-32 dark:text-slate-300">{ACTIVITY_LABELS[c.key as ActivityEventType] ?? c.key}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <div className="h-full rounded-full bg-[#1CB0F6]" style={{ width: `${Math.round((c.count / evTypeMax) * 100)}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right font-black text-[#100F3E] dark:text-white">{c.count}</span>
                    </div>
                  )) : <p className="text-xs font-semibold text-slate-400">Chưa có event nào.</p>}
                </div>
              </div>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Top môn (lượt nộp server)</p>
                  <div className="mt-3 space-y-2">
                    {subjectTops.length ? subjectTops.map((s) => (
                      <div key={s.key} className="flex items-center gap-2.5 text-xs font-bold">
                        <span className="w-36 shrink-0 truncate text-slate-600 sm:w-40 dark:text-slate-300">{s.key}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round((s.count / Math.max(1, subjectTops[0]?.count ?? 1)) * 100)}%` }} />
                        </div>
                        <span className="w-8 shrink-0 text-right font-black text-[#100F3E] dark:text-white">{s.count}</span>
                      </div>
                    )) : <p className="text-xs font-semibold text-slate-400">Chưa có.</p>}
                  </div>
                </div>
                <div className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Top learner (lượt nộp server)</p>
                  <div className="mt-3 space-y-2">
                    {learnerTops.length ? learnerTops.map((l) => (
                      <button key={l.userId} type="button" className="flex w-full items-center gap-2.5 text-left text-xs font-bold text-slate-600 transition-colors hover:text-[#129BDC] dark:text-slate-300" onClick={() => setSelectedId(l.userId)}>
                        <span className="w-36 shrink-0 truncate sm:w-40">{nameById.get(l.userId) ?? l.userId.slice(0, 8)}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.round((l.attempts / Math.max(1, learnerTops[0]?.attempts ?? 1)) * 100)}%` }} />
                        </div>
                        <span className="w-16 shrink-0 text-right font-black text-[#100F3E] dark:text-white">{l.attempts} · {l.avgAccuracy}%</span>
                      </button>
                    )) : <p className="text-xs font-semibold text-slate-400">Chưa có.</p>}
                  </div>
                </div>
              </div>
            </section>
            </>
            ) : null}

            {section === "users" ? (
            <>
            {/* Người dùng */}
            <section id="admin-users" className="scroll-mt-24 space-y-4 sm:space-y-5">
              <AdminSectionHeading
                icon={Users}
                title={lang === "vi" ? "Người dùng" : "Users"}
                description={lang === "vi" ? "Danh sách logined, active theo tài khoản và theo mức độ học tập" : "Logined list, account-active and engagement-active users"}
                action={visible.length ? (
                  <button
                    type="button"
                    className="lp-btn lp-btn--secondary lp-btn--sm"
                    onClick={() => downloadCsv(`admin-users-${new Date().toISOString().slice(0, 10)}.csv`, toAdminCsv(visible))}
                  >
                    <Download className="h-4 w-4" />CSV ({visible.length})
                  </button>
                ) : undefined}
              />
              <div className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn("lp-chip min-h-10 justify-center px-3 text-xs sm:px-4 sm:text-sm", tab === t.key && "is-active")}
                  >
                    {(lang === "vi" ? t.vi : t.en)} ({tabCounts[t.key]})
                  </button>
                ))}
              </div>

              <div className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative block flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={lang === "vi" ? "Tìm email / tên / id…" : "Search email / name / id…"}
                      className="h-11 w-full rounded-[12px] border-2 border-[#E5E5E5] bg-white pl-10 pr-3 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none transition focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 lg:flex">
                    <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="h-11 min-w-0 rounded-[12px] border-2 border-[#E5E5E5] bg-white px-2 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none focus:border-[#7DD3FC] sm:px-3 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]" aria-label="Role">
                      <option value="all">All roles</option>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-11 min-w-0 rounded-[12px] border-2 border-[#E5E5E5] bg-white px-2 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none focus:border-[#7DD3FC] sm:px-3 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]" aria-label="Status">
                      <option value="all">All status</option>
                      <option value="active">active</option>
                      <option value="blocked">blocked</option>
                    </select>
            <select value={sortKey === "risk" ? "risk:desc" : `${sortKey}:${sortDir}`} onChange={(e) => { const [k, d] = e.target.value.split(":"); if (k === "risk") { setSortKey("risk"); return } setSortKey(k as AdminSortKey); setSortDir(d as "asc" | "desc") }} className="h-11 min-w-0 rounded-[12px] border-2 border-[#E5E5E5] bg-white px-2 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none focus:border-[#7DD3FC] sm:px-3 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]" aria-label="Sort">
              <option value="risk:desc">🚩 Rủi ro ↓</option>
              <option value="lastActive:desc">Mới hoạt động nhất</option>
                      <option value="attempts:desc">Lượt làm ↓</option>
                      <option value="points:desc">Points ↓</option>
                      <option value="accuracy:desc">Accuracy ↓</option>
                      <option value="displayName:asc">Tên A→Z</option>
                      <option value="createdAt:desc">Mới login nhất</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <Card variant="dashed" className="py-14 text-center"><p className="text-sm font-bold text-slate-500">Đang tải dữ liệu…</p></Card>
              ) : null}
              {!loading && !visible.length ? (
                <Card variant="dashed" className="py-14 text-center">
                  <BarChart3 className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">Không có user nào khớp filter.</p>
                </Card>
              ) : null}

              {visible.length ? (
                <div className="hidden overflow-hidden rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:shadow-[0_4px_0_#DCDCDC] md:block dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:bg-white/5">
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role / Status</th>
                          <th className="px-4 py-3 text-center" title="Số dấu hiệu bất thường">🚩</th>
                          <th className="px-4 py-3 text-right">Attempts</th>
                          <th className="px-4 py-3 text-right">Acc</th>
                          <th className="px-4 py-3 text-right">Points</th>
                          <th className="px-4 py-3 text-right">Giờ học</th>
                          <th className="px-4 py-3">Last active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUsers.map((u) => (
                          <tr key={u.id} className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-sky-50/60 dark:border-white/5 dark:hover:bg-white/5" onClick={() => setSelectedId(u.id)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-[#E8F7FE] text-[#1CB0F6]">
                                  {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-9 w-9 object-cover" /> : <span className="text-sm font-black">{(u.displayName ?? u.email ?? "?").slice(0, 1).toUpperCase()}</span>}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{u.displayName ?? "(chưa đặt tên)"}</p>
                                  <p className="truncate text-xs font-semibold text-slate-400">{u.email ?? u.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">{u.role}</span>{" "}
                              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", u.status === "active" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>{u.status}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(flagCountByUser.get(u.id) ?? 0) > 0 ? (
                                <span className="inline-block rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-300" title="Có dấu hiệu bất thường, bấm để xem">
                                  🚩{flagCountByUser.get(u.id)}
                                </span>
                              ) : <span className="text-xs font-bold text-slate-300 dark:text-slate-600">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-black text-[#100F3E] dark:text-white">{u.attempts}{u.weekAttempts ? <span className="text-xs font-bold text-slate-400"> (+{u.weekAttempts}/7d)</span> : null}</td>
                            <td className="px-4 py-3 text-right text-sm font-extrabold text-[#100F3E] dark:text-white">{u.averageAccuracy}%</td>
                            <td className="px-4 py-3 text-right text-sm font-black text-[#1CB0F6]">{u.points}</td>
                            <td className="px-4 py-3 text-right text-sm font-extrabold text-[#100F3E] dark:text-white">{formatAdminDuration(u.totalDurationSeconds)}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-400">{formatTime(u.lastActiveAt, lang)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {visible.length ? (
                <div className="space-y-2.5 md:hidden">
                  {pagedUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className="w-full rounded-[15px] border-2 border-[#E5E5E5] bg-white p-3.5 text-left shadow-[0_3px_0_#DCDCDC] transition-all active:scale-[0.99] dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#E8F7FE] text-[#1CB0F6]">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-10 w-10 object-cover" /> : <span className="text-base font-black">{(u.displayName ?? u.email ?? "?").slice(0, 1).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{u.displayName ?? "(chưa đặt tên)"}</p>
                          <p className="truncate text-xs font-semibold text-slate-400">{u.email ?? u.id}</p>
                        </div>
                        {(flagCountByUser.get(u.id) ?? 0) > 0 ? (
                          <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[11px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-300">
                            🚩{flagCountByUser.get(u.id)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">{u.role}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", u.status === "active" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>{u.status}</span>
                        <span className="ml-auto text-[11px] font-bold text-slate-400">{formatTime(u.lastActiveAt, lang)}</span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                        <MobileUserStat value={String(u.attempts)} label={lang === "vi" ? "Lượt" : "Tries"} />
                        <MobileUserStat value={`${u.averageAccuracy}%`} label="Acc" />
                        <MobileUserStat value={String(u.points)} label="Points" accent />
                        <MobileUserStat value={formatAdminDuration(u.totalDurationSeconds)} label={lang === "vi" ? "Giờ học" : "Time"} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
              {visible.length > USER_PAGE_SIZE ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-slate-400">Hiển thị {safePage * USER_PAGE_SIZE + 1}–{Math.min(visible.length, safePage * USER_PAGE_SIZE + USER_PAGE_SIZE)} / {visible.length}</p>
                  <div className="flex gap-2">
                    <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← Trước</button>
                    <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Sau →</button>
                  </div>
                </div>
              ) : null}
            </section>
            </>
            ) : null}

            {section === "timeline" ? (
            <>
            {/* Timeline luồng hoạt động sau active */}
            <section id="admin-timeline" className="scroll-mt-24 space-y-4 sm:space-y-5">
              <AdminSectionHeading
                icon={Activity}
                title={lang === "vi" ? `Luồng hoạt động (${filteredEvents.length}/${rangedEvents.length})` : `Activity (${filteredEvents.length}/${rangedEvents.length})`}
                description={lang === "vi" ? "Mọi luồng của user sau khi active: mở đề, làm bài, nộp, làm lại, xem hạng" : "Every post-activation flow: open, attempt, submit, retry, ranking"}
                action={filteredEvents.length ? (
                  <button
                    type="button"
                    className="lp-btn lp-btn--secondary lp-btn--sm"
                    onClick={() => downloadCsv(`admin-timeline-${new Date().toISOString().slice(0, 10)}.csv`, toTimelineCsv(filteredEvents))}
                  >
                    <Download className="h-4 w-4" />CSV
                  </button>
                ) : undefined}
              />
              <div className="rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOnlyAnomaly((v) => !v)}
                      className={cn("lp-chip min-h-9 justify-center px-3 text-xs", onlyAnomaly && "is-active")}
                      title="Chỉ hiện dòng có dấu hiệu bất thường"
                    >
                      🚩 Bất thường{allFlags.length ? ` (${allFlags.length})` : ""}
                    </button>
                    {EVENT_FILTERS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setEventFilter(f)}
                        className={cn("lp-chip min-h-9 justify-center px-3 text-xs", eventFilter === f && "is-active")}
                      >
                        {f === "all" ? "Tất cả" : ACTIVITY_LABELS[f]}
                      </button>
                    ))}
                  </div>
                  <label className="relative block sm:ml-auto sm:w-[220px]">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={timelineQuery}
                      onChange={(e) => setTimelineQuery(e.target.value)}
                      placeholder="Lọc theo user…"
                      className="h-11 w-full rounded-[12px] border-2 border-[#E5E5E5] bg-white pl-10 pr-3 text-sm font-bold text-[#100F3E] shadow-[0_3px_0_#DCDCDC] outline-none transition focus:border-[#7DD3FC] dark:border-white/10 dark:bg-slate-800 dark:text-white dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]"
                    />
                  </label>
                </div>
              </div>
              {allFlags.length ? (
                <button
                  type="button"
                  onClick={() => { setOnlyAnomaly(true); }}
                  className="flex w-full items-center gap-3 rounded-[16px] border-2 border-red-200 bg-red-50 p-4 text-left shadow-[0_3px_0_#f3b8b8] sm:rounded-[20px] sm:p-5 dark:border-red-500/25 dark:bg-red-500/10 dark:shadow-none"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-red-500 text-lg text-white">🚩</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-red-700 dark:text-red-300">{allFlags.length} dấu hiệu bất thường ở {anomalyUserCount} user (trong dữ liệu đã tải)</span>
                    <span className="mt-0.5 block text-xs font-semibold text-red-500 dark:text-red-400">Bấm để lọc chỉ hiện dòng bất thường · Chỉ review, không tự block</span>
                  </span>
                </button>
              ) : null}
              {eventsError ? (
                <div className="rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 shadow-[0_3px_0_#f5d78e] sm:p-5 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:shadow-none">
                  <p className="font-black">{eventsError}</p>
                </div>
              ) : null}
              {onlyAnomaly && visibleFlags.length ? (
                <ol className="space-y-2.5">
                  {visibleFlags.slice(0, 100).map((f, index) => (
                    <li key={`${f.code}-${f.userId}-${f.createdAt}-${index}`}>
                      <button type="button" onClick={() => setSelectedId(f.userId)} title={lang === "vi" ? "Bấm để xem user" : "Click to view user"} className="flex w-full items-center gap-3 rounded-[15px] border-2 border-red-200 bg-white p-3.5 text-left shadow-[0_3px_0_#f3b8b8] transition-all hover:-translate-y-px sm:rounded-[16px] sm:p-4 dark:border-red-500/25 dark:bg-slate-900 dark:shadow-none">
                        <FlagBadge flag={f} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{ANOMALY_META[f.code].labelVi} · {nameById.get(f.userId) ?? f.userId.slice(0, 8)}</span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">{f.reasonVi}</span>
                        </span>
                        <span className="shrink-0 text-right text-[11px] font-bold leading-4 text-slate-400">{formatTime(f.createdAt, lang)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
              {!eventsError && !filteredEvents.length && (!onlyAnomaly || !visibleFlags.length) ? (
                <Card variant="dashed" className="py-14 text-center">
                  <Activity className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{onlyAnomaly ? "Không có dòng nào dính cờ trong filter hiện tại." : "Chưa có event nào. Hãy làm 1 bài quiz rồi reload — event submit_attempt sẽ hiện ở đây."}</p>
                </Card>
              ) : null}
              {filteredEvents.length ? (
                <ol className="space-y-2.5">
                  {pagedEvents.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => setSelectedId(e.userId)} className="flex w-full items-center gap-3 rounded-[15px] border-2 border-slate-200 bg-white p-3.5 text-left shadow-[0_3px_0_#DCDCDC] transition-all hover:-translate-y-px hover:border-[#7DD3FC] sm:rounded-[16px] sm:p-4 dark:border-white/10 dark:bg-slate-900 dark:shadow-none dark:hover:border-sky-400/30">
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]", EVENT_TONES[e.eventType])}>
                          <Activity className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{nameById.get(e.userId) ?? e.userId.slice(0, 8)}</span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">{ACTIVITY_LABELS[e.eventType]} · {summarizeMetadata(e)}</span>
                          {(flagsByEventId.get(e.id) ?? []).length ? (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {(flagsByEventId.get(e.id) ?? []).map((f) => (
                                <FlagBadge key={`${f.code}-${e.id}`} flag={f} />
                              ))}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-right text-[11px] font-bold leading-4 text-slate-400">{formatTime(e.createdAt, lang)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
              {filteredEvents.length > TIMELINE_PAGE_SIZE ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-slate-400">Hiển thị {safeTimelinePage * TIMELINE_PAGE_SIZE + 1}–{Math.min(filteredEvents.length, safeTimelinePage * TIMELINE_PAGE_SIZE + TIMELINE_PAGE_SIZE)} / {filteredEvents.length}</p>
                  <div className="flex gap-2">
                    <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safeTimelinePage === 0} onClick={() => setTimelinePage(safeTimelinePage - 1)}>← Trước</button>
                    <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safeTimelinePage >= timelinePageCount - 1} onClick={() => setTimelinePage(safeTimelinePage + 1)}>Sau →</button>
                  </div>
                </div>
              ) : null}
            </section>
            </>
            ) : null}

            {section === "attempts" ? (
            <>
            {/* Lịch sử làm bài trên server */}
            <section id="admin-attempts" className="scroll-mt-24 space-y-4 sm:space-y-5">
              <AdminSectionHeading
                icon={History}
                title={lang === "vi" ? `Lịch sử làm bài (${visibleAttempts.length})` : `Attempts (${visibleAttempts.length})`}
                description={lang === "vi" ? "Mọi lượt nộp đã mirror lên server, mới nhất trước" : "Every mirrored submission, newest first"}
                action={
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOnlyAnomaly((v) => !v)}
                      className={cn("lp-btn lp-btn--secondary lp-btn--sm", onlyAnomaly && "!border-[#1CB0F6] !text-[#129BDC]")}
                      title="Chỉ hiện lượt có dấu hiệu bất thường"
                    >
                      🚩
                    </button>
                    <button
                      type="button"
                      className="lp-btn lp-btn--secondary lp-btn--sm"
                      disabled={!visibleAttempts.length}
                      onClick={() => downloadCsv(`admin-attempts-${new Date().toISOString().slice(0, 10)}.csv`, toAttemptsCsv(visibleAttempts))}
                    >
                      <Download className="h-4 w-4" />CSV
                    </button>
                  </div>
                }
              />
              {attemptsError ? (
                <div className="rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 shadow-[0_3px_0_#f5d78e] sm:p-5 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:shadow-none">
                  <p className="font-black">{attemptsError}</p>
                </div>
              ) : null}
              {!attemptsError && !visibleAttempts.length ? (
                <Card variant="dashed" className="py-14 text-center">
                  <History className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{onlyAnomaly ? "Không có lượt nào dính cờ trong khoảng này." : "Chưa có lượt làm nào trong khoảng này. Dữ liệu cũ vẫn nằm ở localStorage từng máy."}</p>
                </Card>
              ) : null}
              {visibleAttempts.length ? (
                <div className="space-y-2.5">
                  {pagedAttempts.map((a) => (
                    <button key={`${a.userId}:${a.historyId}`} type="button" onClick={() => setSelectedId(a.userId)} className="flex w-full items-center gap-3 rounded-[15px] border-2 border-slate-200 bg-white p-3.5 text-left shadow-[0_3px_0_#DCDCDC] transition-all hover:-translate-y-px hover:border-[#7DD3FC] sm:rounded-[16px] sm:p-4 dark:border-white/10 dark:bg-slate-900 dark:shadow-none dark:hover:border-sky-400/30">
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-[12px] bg-sky-50 leading-none text-[#1CB0F6] dark:bg-sky-500/10">
                        <span className="text-sm font-black">{a.score.toFixed(1)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{a.title || a.examId}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">{nameById.get(a.userId) ?? a.userId.slice(0, 8)} · {a.mode}{a.retryNumber ? ` · retry ${a.retryNumber}` : ""} · {a.accuracy}% · {formatTime(a.completedAt, lang)}</span>
                        {(flagsByAttemptKey.get(`${a.userId}:${a.historyId}`) ?? []).length ? (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {(flagsByAttemptKey.get(`${a.userId}:${a.historyId}`) ?? []).map((f) => (
                              <FlagBadge key={`${f.code}-${a.historyId}`} flag={f} />
                            ))}
                          </span>
                        ) : null}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black", a.accuracy >= 80 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : a.accuracy >= 50 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>{a.accuracy}%</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {visibleAttempts.length > ATTEMPTS_PAGE_SIZE ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-slate-400">Hiển thị {safeAttemptsPage * ATTEMPTS_PAGE_SIZE + 1}–{Math.min(visibleAttempts.length, safeAttemptsPage * ATTEMPTS_PAGE_SIZE + ATTEMPTS_PAGE_SIZE)} / {visibleAttempts.length}</p>
                  <div className="flex gap-2">
                    <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safeAttemptsPage === 0} onClick={() => setAttemptsPage(safeAttemptsPage - 1)}>← Trước</button>
                    <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm" disabled={safeAttemptsPage >= attemptsPageCount - 1} onClick={() => setAttemptsPage(safeAttemptsPage + 1)}>Sau →</button>
                  </div>
                </div>
              ) : null}
            </section>
            </>
            ) : null}
          </div>
        </main>
      </div>

      <AdminMobileNav lang={lang} section={section} onNavigate={goSection} />

      {selected ? <UserDrawer user={selected} lang={lang} onClose={() => setSelectedId(null)} /> : null}
      {selectedNotification ? <NotificationHistoryDetail notification={selectedNotification} lang={lang} onClose={() => setSelectedNotification(null)} /> : null}
    </div>
  )
}

function AdminSidebar({
  lang,
  section,
  live,
  profileName,
  profileEmail,
  avatarUrl,
  onNavigate,
  onSignOut,
}: {
  lang: "vi" | "en"
  section: AdminSection
  live: boolean
  profileName: string | null
  profileEmail: string | null
  avatarUrl: string | null
  onNavigate: (key: AdminSection) => void
  onSignOut: () => void
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[200px] flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex dark:border-white/10 dark:bg-slate-900">
      <a href="/" className="flex h-12 items-center gap-2 px-3" aria-label="QuizPKA Admin">
        <img src={brandLogo} alt="QuizPKA" className="h-8 w-auto object-contain" />
        <span className="rounded-full bg-[#E8F7FE] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#129BDC] dark:bg-sky-500/10">Admin</span>
      </a>

      <nav className="mt-7 flex flex-1 flex-col gap-1.5" aria-label="Admin">
        {SECTION_NAV.map((item) => {
          const Icon = item.icon
          const isActive = section === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={cn(
                "group flex w-full items-center gap-3.5 rounded-[var(--radius-sm)] px-[14px] py-[10px] text-left text-[12px] font-bold leading-5 text-[var(--gray-text)] transition-all duration-200",
                isActive
                  ? "bg-sky-50 text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300"
                  : "hover:bg-slate-50 hover:text-[#18181B] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon className="h-[19px] w-[19px]" />
              </span>
              <span className="sidebar-label font-bold">{lang === "vi" ? item.vi : item.en}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 pt-4 dark:border-white/10">
        <div className="mb-1 flex items-center gap-2 px-2">
          <span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse bg-emerald-500" : "bg-slate-300")} />
          <span className="text-[11px] font-bold text-slate-400">{live ? "Realtime Live" : "Chế độ tĩnh"}</span>
        </div>
        <div className="mb-3 flex items-center gap-3 px-2">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-500/10"><UserRound className="h-4 w-4" /></div>}
          <div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#100F3E] dark:text-white">{profileName ?? "Admin"}</p><p className="truncate text-[11px] font-semibold text-slate-400">{profileEmail}</p></div>
        </div>
        <button type="button" className="lp-btn lp-btn--secondary lp-btn--sm lp-btn--block" onClick={onSignOut}><LogOut className="h-4 w-4" />{lang === "vi" ? "Đăng xuất" : "Sign out"}</button>
      </div>
    </aside>
  )
}

function AdminTopbar({ lang, profileName, live, onReload, reloading, onSignOut }: { lang: "vi" | "en"; profileName: string | null; live: boolean; onReload: () => void; reloading: boolean; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-2xl dark:bg-[#18191A]/80">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 md:px-8 lg:h-[72px] lg:px-8 xl:px-10">
        <a href="/" className="flex items-center lg:hidden" aria-label="QuizPKA">
          <img src={brandLogo} alt="QuizPKA" className="h-8 w-auto" />
        </a>
        <div className="hidden min-w-0 lg:block">
          <h1 className="truncate text-base font-semibold text-[#100F3E] dark:text-white">
            {lang === "vi" ? "Xin chào" : "Hello"}, {profileName ?? "Admin"}!
          </h1>
          <p className="text-xs font-semibold text-slate-400">{lang === "vi" ? "Thống kê toàn bộ user đã đăng nhập" : "Stats for all logged-in users"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={cn("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex", live ? "bg-[#F0F2F5] text-emerald-600 dark:bg-[#3A3B3C] dark:text-emerald-300" : "bg-[#F0F2F5] text-slate-400 dark:bg-[#3A3B3C] dark:text-slate-400")} title={live ? "Realtime đang bật: event mới tự hiện" : "Realtime chưa kết nối"}>
            <span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse bg-emerald-500" : "bg-slate-300")} />
            {live ? "Live" : lang === "vi" ? "Tĩnh" : "Static"}
          </span>
          <button
            type="button"
            aria-label={lang === "vi" ? "Tải lại dữ liệu" : "Reload data"}
            title={lang === "vi" ? "Tải lại dữ liệu" : "Reload data"}
            onClick={onReload}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition-[transform,background-color] duration-150 hover:bg-[#E4E6EB] active:scale-95 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]"
          >
            <RefreshCw className={cn("h-5 w-5", reloading && "animate-spin")} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={lang === "vi" ? "Đăng xuất" : "Sign out"}
            title={lang === "vi" ? "Đăng xuất" : "Sign out"}
            onClick={onSignOut}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition-[transform,background-color,color] duration-150 hover:bg-[#E4E6EB] hover:text-red-600 active:scale-95 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50] dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  )
}

function AdminMobileNav({ lang, section, onNavigate }: { lang: "vi" | "en"; section: AdminSection; onNavigate: (key: AdminSection) => void }) {
  return (
    <MobileTabBar
      ariaLabel="Mobile admin"
      activeKey={section}
      onNavigate={onNavigate}
      items={SECTION_NAV.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: lang === "vi" ? item.vi : item.en,
      }))}
    />
  )
}

function AdminSectionHeading({ title, description, icon: Icon, action }: { title: string; description: string; icon: ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] sm:h-14 sm:w-14 sm:rounded-[16px] dark:bg-sky-500/10"><Icon className="h-5 w-5 sm:h-7 sm:w-7" /></div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[22px] font-black leading-7 tracking-[-0.03em] text-[#100F3E] sm:text-[28px] dark:text-white">{title}</h2>
        <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-500 sm:mt-1 sm:text-sm dark:text-slate-400">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function summarizeMetadata(e: ActivityEvent): string {
  const m = e.metadata
  const parts: string[] = []
  for (const k of ["examId", "subjectId", "mode", "score", "accuracy"]) {
    const v: unknown = m[k]
    if (v === undefined || v === null || v === "") continue
    parts.push(`${k}=${typeof v === "object" ? JSON.stringify(v) : String(v as string | number | boolean)}`)
  }
  return parts.length ? parts.join(" · ") : e.eventType
}

const SEVERITY_TONE: Record<AnomalySeverity, string> = {
  high: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
  medium: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  low: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300",
}

function FlagBadge({ flag }: { flag: AnomalyFlag }) {
  return (
    <span
      title={`${ANOMALY_META[flag.code].labelVi}: ${flag.reasonVi}`}
      className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-black", SEVERITY_TONE[flag.severity])}
    >
      {flag.code}
    </span>
  )
}

function UserDrawer({ user, lang, onClose }: { user: AdminUser; lang: "vi" | "en"; onClose: () => void }) {
  const [userEvents, setUserEvents] = useState<ActivityEvent[]>([])
  const [userAttempts, setUserAttempts] = useState<PracticeAttemptRow[]>([])
  const userFlags = useMemo(() => detectUserAnomalies(userAttempts, userEvents), [userAttempts, userEvents])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  useEffect(() => {
    let cancelled = false
    void fetchUserActivity(user.id, 200).then((r) => { if (!cancelled) setUserEvents(r.events) })
    void fetchPracticeAttempts(user.id, 200).then((r) => { if (!cancelled) setUserAttempts(r.attempts) })
    return () => { cancelled = true }
  }, [user.id])
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="close" className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]" onClick={onClose} />
      <aside className="contact-modal-panel relative z-10 flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-[18px] border-2 border-[#E5E5E5] bg-white shadow-[0_6px_0_#DCDCDC] sm:rounded-[20px] dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#E8F7FE] text-[#1CB0F6]">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-12 w-12 object-cover" /> : <span className="text-xl font-black">{(user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="min-w-0">
              <h2 className="lp-modal-title truncate text-[18px] sm:text-[20px]">{user.displayName ?? "(chưa đặt tên)"}</h2>
              <p className="lp-modal-desc mt-0.5 truncate text-[13px]">{user.email ?? user.id}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-black">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-white/10 dark:text-slate-300">{user.role}</span>
                <span className={cn("rounded-full px-2 py-0.5", user.status === "active" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>{user.status}</span>
              </p>
            </div>
          </div>
          <button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label="Đóng"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
            <DrawerMetric label="Attempts" value={String(user.attempts)} />
            <DrawerMetric label="Attempts 7d" value={String(user.weekAttempts)} />
            <DrawerMetric label="Môn đã ôn" value={String(user.subjectsReviewed)} />
            <DrawerMetric label="Accuracy" value={`${user.averageAccuracy}%`} />
            <DrawerMetric label="Points" value={String(user.points)} />
            <DrawerMetric label="Giờ học" value={formatAdminDuration(user.totalDurationSeconds)} />
          </div>
          <DrawerRow label="ID" value={user.id} mono />
          <DrawerRow label="Ngày login đầu (created_at)" value={formatTime(user.createdAt, lang)} />
          <DrawerRow label="Hoạt động gần nhất" value={formatTime(user.lastActiveAt, lang)} />
          <DrawerRow label="Hiện trên leaderboard" value={user.leaderboardVisible ? "true" : "false"} />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Rủi ro {userFlags.length ? `(score ${riskScore(userFlags)})` : "(sạch)"}
            </p>
            <div className="mt-2 space-y-1.5">
              {userFlags.length ? userFlags.map((f, i) => (
                <div key={`${f.code}-${i}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold dark:bg-white/5">
                  <span className="mr-1.5 inline-flex align-middle"><FlagBadge flag={f} /></span>
                  <span className="font-black text-[#100F3E] dark:text-white">{ANOMALY_META[f.code].labelVi}</span>
                  <span className="block text-slate-400">{f.reasonVi} · {formatTime(f.createdAt, lang)}</span>
                </div>
              )) : <p className="text-xs font-semibold text-slate-400">Không phát hiện dấu hiệu A1/A2/A3/A6/A7.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Luồng sau active ({userEvents.length})</p>
            <div className="mt-2 space-y-1.5">
              {userEvents.length ? userEvents.map((e) => (
                <div key={e.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold dark:bg-white/5">
                  <span className="font-black text-[#129BDC]">{ACTIVITY_LABELS[e.eventType]}</span>
                  <span className="text-slate-400"> · {summarizeMetadata(e)} · {formatTime(e.createdAt, lang)}</span>
                </div>
              )) : <p className="text-xs font-semibold text-slate-400">Chưa có event nào (user chưa hoạt động từ khi bật log, hoặc RLS chưa migrate).</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Lịch sử làm bài server ({userAttempts.length})</p>
            <div className="mt-2 space-y-1.5">
              {userAttempts.length ? userAttempts.map((a) => (
                <div key={a.historyId} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold dark:bg-white/5">
                  <span className="font-black text-[#100F3E] dark:text-white">{a.title || a.examId}</span>
                  <span className="text-slate-400"> · {a.score.toFixed(1)}đ · {a.accuracy}% · {formatTime(a.completedAt, lang)}</span>
                </div>
              )) : <p className="text-xs font-semibold text-slate-400">Chưa có lượt nào trên server. Dữ liệu cũ nằm ở localStorage từng máy.</p>}
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-400">Mọi dữ liệu raw</summary>
            <pre className="mt-2 max-h-[240px] overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-5 dark:bg-white/5">{JSON.stringify(user, null, 2)}</pre>
          </details>
        </div>
      </aside>
    </div>
  )
}

function NotificationHistoryDetail({ notification, lang, onClose }: { notification: AdminNotificationHistory; lang: "vi" | "en"; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const readCount = notification.recipients.filter((recipient) => recipient.readAt).length
  return <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
    <button type="button" aria-label="Đóng" className="contact-modal-overlay absolute inset-0 bg-[rgba(16,15,62,0.45)] backdrop-blur-[2px]" onClick={onClose} />
    <aside role="dialog" aria-modal="true" className="contact-modal-panel relative z-10 flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-[18px] border-2 border-[#E5E5E5] bg-white shadow-[0_6px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5 dark:border-white/10"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-[#129BDC]">Chi tiết thông báo</p><h2 className="mt-1 truncate text-xl font-black text-[#100F3E] dark:text-white">{notification.title}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{notification.isDirect ? "Gửi riêng" : "Tất cả user"} · {formatTime(notification.createdAt, lang)}</p></div><button type="button" className="lp-btn lp-btn--secondary lp-btn--icon shrink-0" onClick={onClose} aria-label="Đóng"><X className="h-4 w-4" /></button></div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6"><div className="rounded-xl bg-slate-50 p-3.5 text-sm font-semibold leading-6 text-slate-600 dark:bg-white/5 dark:text-slate-300">{notification.message}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><DrawerMetric label="Tổng người nhận" value={String(notification.recipientCount)} /><DrawerMetric label="Đã đọc" value={`${readCount}`} /><DrawerMetric label="Chưa đọc" value={`${notification.recipientCount - readCount}`} /></div><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Danh sách người nhận</p><div className="mt-2 space-y-1.5">{notification.recipients.map((recipient) => <div key={recipient.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5"><div className="min-w-0"><p className="truncate text-sm font-black text-[#100F3E] dark:text-white">{recipient.displayName ?? "(chưa đặt tên)"}</p><p className="truncate text-xs font-semibold text-slate-400">{recipient.email ?? recipient.id}</p></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-black", recipient.readAt ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300")}>{recipient.readAt ? "Đã đọc" : "Chưa đọc"}</span></div>)}</div></div></div>
    </aside>
  </div>
}

function MobileUserStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-[10px] bg-[#F6F7FB] px-1 py-2 text-center dark:bg-white/5">
      <p className={cn("truncate text-sm font-black", accent ? "text-[#1CB0F6]" : "text-[#100F3E] dark:text-white")}>{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">{label}</p>
    </div>
  )
}

function DrawerMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center dark:bg-white/5"><p className="text-lg font-black text-[#100F3E] dark:text-white">{value}</p><p className="mt-0.5 text-[11px] font-bold text-slate-400">{label}</p></div>
}

function DrawerRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold break-all text-[#100F3E] dark:text-white", mono && "font-mono text-xs")}>{value}</p>
    </div>
  )
}
