import { ArrowLeft, BadgeCheck, Copyright, CreditCard, PackageCheck, ReceiptText, ScrollText, ShieldCheck } from "lucide-react"
import { navigate, appRoutes } from "@/app/navigation"
import { cn } from "@/lib/utils"
import type { Language } from "@/shared/types/app"

type Section = {
  id: string
  heading: string
  intro: string[]
  list: string[]
  accent: string
  badge: string
}

type Copy = {
  eyebrow: string
  title: string
  intro: string
  perks: [string, string, string]
  toc: string
  sections: Section[]
  method: string
  timing: string
  note: string
  methodRow: [string, string, string]
  lifetime: string
  back: string
}

const copy: Record<Language, Copy> = {
  vi: {
    eyebrow: "Điều khoản • Chính sách",
    title: "Chính sách & Quy định sử dụng",
    intro:
      "Đọc kỹ các nội dung dưới đây trước khi sử dụng Quizpka và mua các môn ôn tập trả phí. Tiếp tục sử dụng dịch vụ đồng nghĩa bạn đã hiểu và đồng ý toàn bộ chính sách này.",
    perks: ["10.000 VND / môn", "Kích hoạt gần như tức thì", "Không giới hạn lượt, vĩnh viễn"],
    toc: "Mục lục",
    sections: [
      {
        id: "dieu-khoan",
        heading: "Điều khoản sử dụng dịch vụ",
        intro: ["Quizpka là nền tảng ôn luyện trắc nghiệm dành cho sinh viên, gồm các bộ đề miễn phí và các môn ôn tập trả phí theo từng môn học."],
        list: [
          "Đăng nhập bằng tài khoản Google để làm quiz, lưu tiến độ, mua môn trả phí và nhận thông báo.",
          "Mỗi tài khoản phục vụ một cá nhân; không chia sẻ tài khoản hoặc quyền truy cập các môn đã mua cho người khác.",
          "Không sao chép, trích xuất, quay màn hình hay phát tán ngân hàng câu hỏi và nội dung ôn tập dưới bất kỳ hình thức nào.",
          "Tài khoản vi phạm có thể bị hạn chế hoặc đình chỉ mà không cần báo trước.",
        ],
        accent: "bg-sky-500",
        badge: "bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300",
      },
      {
        id: "thanh-toan",
        heading: "Chính sách thanh toán",
        intro: ["Các môn trả phí được bán theo từng môn với giá 10.000 VND/môn, thanh toán bằng chuyển khoản ngân hàng/VietQR do SePay xử lý:"],
        list: [
          "Nhấn mua ở môn muốn ôn - hệ thống tạo đơn hàng và mã QR thanh toán.",
          "Quét mã QR và chuyển khoản đúng số tiền cùng nội dung chuyển khoản.",
          "Hệ thống xác nhận giao dịch và kích hoạt quyền truy cập - bạn có thể vào ôn ngay.",
        ],
        accent: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        id: "giao-nhan",
        heading: "Giao nhận sản phẩm số",
        intro: ["Môn ôn tập trả phí là sản phẩm số (ngân hàng câu hỏi cùng các chế độ luyện tập và làm bài thi). Giao nhận nghĩa là mở quyền truy cập trực tiếp trên tài khoản của bạn - Quizpka không gửi bất kỳ vật phẩm vật lý nào."],
        list: [
          "Thanh toán thành công và được xác nhận: quyền truy cập được kích hoạt gần như ngay lập tức.",
          "Trường hợp cần hỗ trợ thủ công: xử lý trong vòng 1–2 giờ làm việc.",
          "Sau khi mua, vào mục Đã mua để bắt đầu ôn luyện.",
        ],
        accent: "bg-violet-500",
        badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
      },
      {
        id: "hoan-tien",
        heading: "Hoàn tiền & hủy",
        intro: ["Do đặc thù sản phẩm số được kích hoạt ngay sau thanh toán, Quizpka không hỗ trợ hoàn tiền sau khi quyền truy cập môn học đã được mở."],
        list: [
          "Nếu lỗi kỹ thuật từ phía hệ thống khiến bạn không thể truy cập môn đã mua, hãy phản hồi trong vòng 7 ngày kể từ lúc mua - chúng tôi cam kết xử lý trong 24–48 giờ làm việc.",
          "Mọi yêu cầu hỗ trợ vui lòng gửi qua Email quizpka@gmail.com ở chân trang.",
        ],
        accent: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      },
      {
        id: "bao-mat",
        heading: "Cam kết bảo mật thông tin",
        intro: ["Quizpka chỉ thu thập tên và email của bạn nhằm quản lý tài khoản, lưu tiến độ ôn tập, gửi thông báo và xác nhận giao dịch."],
        list: [
          "Đăng nhập qua Google OAuth - Quizpka không lưu mật khẩu của bạn.",
          "Thanh toán do SePay xử lý và mã hóa - Quizpka không lưu thông tin thẻ hay tài khoản ngân hàng.",
          "Chúng tôi không cung cấp dữ liệu cho bên thứ ba, trừ khi cơ quan có thẩm quyền yêu cầu theo quy định.",
          "Bạn có quyền yêu cầu xóa tài khoản và toàn bộ dữ liệu cá nhân bằng cách gửi Email tới quizpka@gmail.com (xem chân trang).",
        ],
        accent: "bg-rose-500",
        badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
      },
      {
        id: "ban-quyen",
        heading: "6. Quy định về bản quyền",
        intro: ["Toàn bộ ngân hàng câu hỏi, đề ôn tập và nội dung các môn trả phí trên Quizpka thuộc bản quyền của đội ngũ phát triển và được bảo hộ theo Luật Sở hữu trí tuệ Việt Nam."],
        list: [
          "Khi phát hiện hành vi sao chép, phát tán trái phép, Quizpka sẽ phối hợp với cơ quan chức năng có thẩm quyền để yêu cầu bồi thường thiệt hại và truy cứu trách nhiệm pháp lý, xử phạt vi phạm hành chính theo quy định của pháp luật Việt Nam.",
        ],
        accent: "bg-indigo-500",
        badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
      },
    ],
    method: "Phương thức",
    timing: "Thời gian xử lý",
    note: "Lưu ý",
    methodRow: ["Chuyển khoản VietQR", "Gần như tức thì sau khi xác nhận", "Nên dùng tài khoản chính chủ, giữ nguyên nội dung chuyển khoản"],
    lifetime: "Không giới hạn số lần làm, hạn dùng vĩnh viễn.",
    back: "Về trang chủ",
  },
  en: {
    eyebrow: "Quizpka • Policy",
    title: "Policies & Terms of Use",
    intro:
      "Please read the following carefully before using Quizpka and purchasing paid quiz subjects. Continued use of the service means you understand and agree to this entire policy.",
    perks: ["10,000 VND / subject", "Near-instant activation", "Unlimited attempts, forever"],
    toc: "Contents",
    sections: [
      {
        id: "dieu-khoan",
        heading: "Terms of service",
        intro: ["Quizpka is a multiple-choice practice platform for students, offering both free question sets and paid per-subject review packs."],
        list: [
          "Sign in with a Google account to take quizzes, save progress, purchase paid subjects, and receive notifications.",
          "Each account serves one individual; do not share your account or access to purchased subjects with others.",
          "Do not copy, extract, screen-record, or redistribute the question banks and review content in any form.",
          "Accounts in violation may be restricted or suspended without prior notice.",
        ],
        accent: "bg-sky-500",
        badge: "bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300",
      },
      {
        id: "thanh-toan",
        heading: "Payment policy",
        intro: ["Paid subjects are sold per subject at 10,000 VND each, paid by bank transfer/VietQR processed by SePay:"],
        list: [
          "Tap buy on the subject you want - the system creates an order and a payment QR code.",
          "Scan the code and transfer the exact amount with the given transfer note.",
          "The system verifies the transaction and activates your access - you can start practicing right away.",
        ],
        accent: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        id: "giao-nhan",
        heading: "Digital product delivery",
        intro: ["Paid review subjects are digital products (question banks with practice and exam modes). Delivery means activating access directly on your account - Quizpka ships no physical items."],
        list: [
          "Successful, verified payments: access is activated almost instantly.",
          "Cases needing manual support: handled within 1–2 business hours.",
          "After purchase, open Purchased to start practicing.",
        ],
        accent: "bg-violet-500",
        badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
      },
      {
        id: "hoan-tien",
        heading: "Refunds & cancellation",
        intro: ["Because digital products are activated immediately after payment, Quizpka does not offer refunds once subject access has been granted."],
        list: [
          "If a technical fault on our side prevents you from accessing a purchased subject, contact us within 7 days of purchase - we commit to resolving it within 24–48 business hours.",
          "Please send all support requests to quizpka@gmail.com (see the footer).",
        ],
        accent: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      },
      {
        id: "bao-mat",
        heading: "Privacy commitment",
        intro: ["Quizpka only collects your name and email to manage your account, save practice progress, send notifications, and confirm transactions."],
        list: [
          "Sign-in via Google OAuth - Quizpka never stores your password.",
          "Payments are processed and encrypted by SePay - Quizpka never stores card or bank account details.",
          "We do not share data with third parties, except when required by competent authorities under applicable regulations.",
          "You may request deletion of your account and all personal data by emailing quizpka@gmail.com (see the footer).",
        ],
        accent: "bg-rose-500",
        badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
      },
      {
        id: "ban-quyen",
        heading: "6. Copyright",
        intro: ["All question banks, review materials, and paid subject content on Quizpka belong to the development team and are protected under Vietnam's Intellectual Property Law."],
        list: [
          "Upon detecting unauthorized copying or distribution, Quizpka will cooperate with competent authorities to claim damages and pursue legal liability and administrative penalties under Vietnamese law.",
        ],
        accent: "bg-indigo-500",
        badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
      },
    ],
    method: "Method",
    timing: "Processing time",
    note: "Note",
    methodRow: ["VietQR transfer", "Nearly instant after verification", "Use your own bank account and keep the transfer note intact"],
    lifetime: "Unlimited attempts, lifetime access.",
    back: "Back to home",
  },
} as const

const sectionIcons = [ScrollText, CreditCard, PackageCheck, ReceiptText, ShieldCheck, Copyright] as const

export function PolicyPage({ lang }: { lang: Language }) {
  const t = copy[lang]
  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-6 pb-20 pt-10 sm:pt-14 lg:px-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-[20px] border-2 border-[#E5E5E5] bg-gradient-to-b from-[#E8F7FE] to-white shadow-[0_4px_0_#DCDCDC] sm:rounded-[24px] dark:border-white/10 dark:from-sky-500/10 dark:to-slate-900 dark:shadow-none">
        <div className="p-5 sm:p-8">
          <span className="inline-block rounded-full bg-[#1CB0F6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {t.eyebrow}
          </span>
          <h1 className="mt-3 text-2xl font-black leading-8 tracking-[-0.02em] text-[#100F3E] sm:text-[32px] sm:leading-10 dark:text-white">
            {t.title}
          </h1>
          <p className="mt-3 max-w-[640px] text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            {t.intro}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {t.perks.map((perk) => (
              <span
                key={perk}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-black text-[#100F3E] dark:border-white/10 dark:bg-slate-900 dark:text-white"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-[#1CB0F6]" strokeWidth={2.5} />
                {perk}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Mục lục */}
      <nav
        aria-label={t.toc}
        className="mt-4 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:p-5 sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">{t.toc}</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {t.sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="flex items-center gap-2.5 rounded-[12px] border border-transparent px-2.5 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-sky-100 hover:bg-[#F4FBFF] hover:text-[#100F3E] dark:text-slate-300 dark:hover:border-sky-500/15 dark:hover:bg-sky-500/[0.06] dark:hover:text-white"
              >
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black", section.badge)}>
                  {index + 1}
                </span>
                <span className="truncate">{section.heading.replace(/^\d+\.\s*/, "")}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Các mục chính sách */}
      <div className="mt-4 space-y-4">
        {t.sections.map((section, index) => {
          const Icon = sectionIcons[index % sectionIcons.length]
          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 rounded-[16px] border-2 border-[#E5E5E5] bg-white shadow-[0_3px_0_#DCDCDC] sm:rounded-[20px] sm:shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
            >
              <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-white/10">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-sm font-black text-white", section.accent)}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-[#100F3E] sm:text-lg dark:text-white">
                    {section.heading}
                  </h2>
                </div>
                <Icon className="ml-auto h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" strokeWidth={2} />
              </header>
              <div className="p-4 sm:p-6">
                {section.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {paragraph}
                  </p>
                ))}

                {section.id === "thanh-toan" ? (
                  <ol className="mt-4 space-y-0">
                    {section.list.map((item, step) => (
                      <li key={item.slice(0, 24)} className="relative flex gap-3 pb-4 last:pb-0">
                        {step < section.list.length - 1 ? (
                          <span aria-hidden="true" className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-0.5 bg-emerald-100 dark:bg-emerald-500/20" />
                        ) : null}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                          {step + 1}
                        </span>
                        <p className="pt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {section.list.map((item) => (
                      <li key={item.slice(0, 24)} className="flex gap-2.5 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                        <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-[#1CB0F6]" strokeWidth={2.5} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.id === "thanh-toan" ? (
                  <>
                    <div className="mt-4 overflow-x-auto rounded-[12px] border border-slate-200 dark:border-white/10">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:bg-white/5">
                            <th className="px-4 py-3">{t.method}</th>
                            <th className="px-4 py-3">{t.timing}</th>
                            <th className="px-4 py-3">{t.note}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-100 dark:border-white/5">
                            {t.methodRow.map((cell) => (
                              <td key={cell.slice(0, 16)} className="px-4 py-3 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border-2 border-sky-100 bg-[#F4FBFF] p-4 dark:border-sky-500/15 dark:bg-sky-500/[0.06]">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1CB0F6]" strokeWidth={2.5} />
                      <p className="text-sm font-black leading-6 text-[#100F3E] dark:text-white">{t.lifetime}</p>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          className="lp-btn lp-btn--secondary lp-btn--sm inline-flex items-center gap-2"
          onClick={() => navigate(appRoutes.home)}
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </button>
      </div>
    </main>
  )
}
