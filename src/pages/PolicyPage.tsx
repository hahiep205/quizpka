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
    perks: ["Kích hoạt gần như tức thì", "Không giới hạn lượt số lượt làm quiz", "Không giới hạn thời gian sử dụng"],
    toc: "Mục lục",
    sections: [
      {
        id: "dieu-khoan",
        heading: "Điều khoản sử dụng dịch vụ",
        intro: ["Quizpka là nền tảng ôn luyện trắc nghiệm dành riêng cho sinh viên Phenikaa, gồm các bộ đề miễn phí và trả phí theo từng môn học."],
        list: [
          "Đăng nhập bằng tài khoản Google để làm quiz, lưu tiến độ, mua môn trả phí và nhận thông báo.",
          "Mỗi tài khoản phục vụ một cá nhân - vui lòng không đưa tài khoản hay chia sẻ các gói đã mua cho người khác dùng chung.",
          "Nghiêm cấm trích xuất, ghi màn hình, sao chép hoặc lan truyền kho câu hỏi và học liệu ôn tập dưới mọi hình thức.",
          "Nếu phát hiện vi phạm, chúng tôi có quyền giới hạn hoặc khóa tài khoản mà không cần thông báo trước.",
        ],
        accent: "bg-sky-500",
        badge: "bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300",
      },
      {
        id: "thanh-toan",
        heading: "Chính sách thanh toán",
        intro: ["Thanh toán qua chuyển khoản ngân hàng hoặc VietQR, giao dịch do SePay đảm nhiệm:"],
        list: [
          "Chọn gói muốn ôn và bấm mua, đơn hàng kèm mã QR sẽ hiện ra ngay.",
          "Mở app ngân hàng, quét QR rồi chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản.",
          "Khi giao dịch được xác thực, gói học mở khóa tự động và bạn ôn được luôn.",
        ],
        accent: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        id: "giao-nhan",
        heading: "Giao nhận sản phẩm số",
        intro: ["Gói ôn tập là sản phẩm số: toàn bộ câu hỏi, chế độ luyện và thi thử nằm ngay trong tài khoản của bạn sau khi mua, không có món đồ vật lý nào được gửi đi."],
        list: [
          "Giao dịch thành công: gói học mở khóa gần như tức thời.",
          "Trường hợp phải xử lý thủ công: chúng tôi hoàn tất trong 1-5 giờ hành chính.",
          "Mở trang Đã mua là thấy các gói của mình, bấm vào học ngay.",
        ],
        accent: "bg-violet-500",
        badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
      },
      {
        id: "hoan-tien",
        heading: "Hoàn tiền & hủy",
        intro: ["Vì gói học mở khóa ngay khi trả tiền xong, chúng tôi không hoàn tiền cho các gói đã kích hoạt."],
        list: [
          "Riêng sự cố kỹ thuật từ hệ thống làm bạn không vào được gói đã trả tiền: báo cho chúng tôi trong 7 ngày từ lúc mua, cam kết trả lời hướng xử lý trong 24-48 giờ làm việc.",
          "Mọi thắc mắc gửi về quizpka@gmail.com.",
        ],
        accent: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      },
      {
        id: "bao-mat",
        heading: "Cam kết bảo mật thông tin",
        intro: ["Chúng tôi chỉ giữ tên và email của bạn để vận hành tài khoản: lưu kết quả học, gửi thông báo và đối soát thanh toán."],
        list: [
          "Đăng nhập qua Google OAuth - Quizpka không lưu mật khẩu của bạn.",
          "Tiền chạy qua SePay với mã hóa đạt chuẩn - thông tin thẻ và tài khoản ngân hàng không nằm ở máy chủ Quizpka.",
          "Dữ liệu không bán, không chia sẻ cho bên ngoài, trừ khi pháp luật bắt buộc.",
          "Muốn xóa hồ sơ và toàn bộ dữ liệu của mình? Chỉ cần mail tới quizpka@gmail.com.",
        ],
        accent: "bg-rose-500",
        badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
      },
      {
        id: "ban-quyen",
        heading: "6. Quy định về bản quyền",
        intro: ["Kho câu hỏi, bộ đề và toàn bộ học liệu trả phí trên Quizpka là tài sản của nhóm phát triển, được pháp luật Việt Nam về sở hữu trí tuệ bảo vệ."],
        list: [
          "Mọi hình thức lấy trộm, đăng lại hay phân phối học liệu mà chưa được phép đều là hành vi xâm phạm bản quyền.",
        ],
        accent: "bg-indigo-500",
        badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
      },
    ],
    method: "Phương thức",
    timing: "Thời gian xử lý",
    note: "Lưu ý",
    methodRow: ["Chuyển khoản VietQR", "Không quá 1 phút", "Ưu tiên tài khoản của chính bạn, KHÔNG ĐƯỢC sửa nội dung chuyển khoản"],
    lifetime: "Không giới hạn số lần làm và thời gian sử dụng.",
    back: "Về trang chủ",
  },
  en: {
    eyebrow: "Terms • Policy",
    title: "Policies & Terms of Use",
    intro:
      "Please read the following carefully before using Quizpka and purchasing paid quiz subjects. Continued use of the service means you understand and agree to this entire policy.",
    perks: ["Activates almost instantly", "Unlimited quiz attempts", "Unlimited usage time"],
    toc: "Contents",
    sections: [
      {
        id: "dieu-khoan",
        heading: "Terms of service",
        intro: ["Quizpka is a multiple-choice revision platform built exclusively for Phenikaa students, offering free and paid exam sets for each subject."],
        list: [
          "Sign in with your Google account to take quizzes, save progress, buy paid subjects and receive notifications.",
          "Each account serves one person - please don't hand your account to others or share packs you've bought.",
          "Extracting, screen-recording, copying, or redistributing the question bank and study materials in any form is strictly prohibited.",
          "If we detect a violation, we may restrict or suspend the profile without advance notice.",
        ],
        accent: "bg-sky-500",
        badge: "bg-[#E8F7FE] text-[#129BDC] dark:bg-sky-500/10 dark:text-sky-300",
      },
      {
        id: "thanh-toan",
        heading: "Payment policy",
        intro: ["Pay by bank transfer or VietQR - every transaction runs through SePay:"],
        list: [
          "Pick the pack you want and hit buy; your order and QR code appear instantly.",
          "Open your banking app, scan the code, and transfer the exact amount without editing the payment note.",
          "Once the transaction clears, your pack unlocks automatically and you can study right away.",
        ],
        accent: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        id: "giao-nhan",
        heading: "Digital product delivery",
        intro: ["Study packs are digital goods: all questions, drill modes, and mock exams live inside your account after purchase - nothing physical is ever shipped."],
        list: [
          "Successful transaction: your pack unlocks almost instantly.",
          "Cases that need manual processing: we finish them within 1-5 business hours.",
          "Open the Purchased page to find your pack and start studying.",
        ],
        accent: "bg-violet-500",
        badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
      },
      {
        id: "hoan-tien",
        heading: "Refunds & cancellation",
        intro: ["Because packs unlock the moment payment completes, we don't refund packs that have already been activated."],
        list: [
          "One exception - our own technical fault blocking access to something you paid for: tell us within 7 days of purchase and we commit to a resolution plan within 24-48 business hours.",
          "Send any questions to quizpka@gmail.com.",
        ],
        accent: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      },
      {
        id: "bao-mat",
        heading: "Privacy commitment",
        intro: ["We keep only your name and email, used to run your account: storing study results, sending notifications, and reconciling payments."],
        list: [
          "Sign-in runs through Google OAuth - Quizpka never stores your password.",
          "Money flows through SePay under proper encryption - card and bank details never sit on Quizpka servers.",
          "Data is never sold or shared externally, except where the law compels it.",
          "Want your profile and all your data erased? Just email quizpka@gmail.com.",
        ],
        accent: "bg-rose-500",
        badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
      },
      {
        id: "ban-quyen",
        heading: "6. Copyright",
        intro: ["The question bank, exam sets, and all paid study materials on Quizpka belong to the development team and are protected by Vietnamese intellectual-property law."],
        list: [
          "Stealing, reposting, or distributing the materials without permission all count as copyright infringement.",
        ],
        accent: "bg-indigo-500",
        badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
      },
    ],
    method: "Method",
    timing: "Processing time",
    note: "Note",
    methodRow: ["VietQR transfer", "No more than 1 minute", "Prefer your own bank account and DO NOT edit the transfer note"],
    lifetime: "Unlimited attempts with no time limit.",
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
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-black text-[#100F3E] dark:border-white/10 dark:bg-slate-900 dark:text-white">
                        <BadgeCheck className="h-3.5 w-3.5 text-[#1CB0F6]" strokeWidth={2.5} aria-hidden="true" />
                        {t.lifetime}
                      </span>
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
