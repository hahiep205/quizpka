type ExamType = "midterm" | "final"

export type SubjectId =
  | "tieng-anh-dau-vao"
  | "tu-tuong-ho-chi-minh"
  | "lich-su-dang-cong-san-viet-nam"
  | "quan-tri-hoc"
  | "triet-hoc-mac-lenin-2tc"
  | "triet-hoc-mac-lenin-3tc"
  | "ky-nang-quan-ly-du-an"
  | "chu-nghia-xa-hoi-khoa-hoc"
  | "danh-gia-va-kiem-dinh-chat-luong-phan-mem"
  | "kinh-te-vi-mo"
  | "kinh-te-chinh-tri-mac-lenin"
  | "ky-nang-khoi-nghiep-va-lanh-dao"
  | "bao-mat-ung-dung-he-thong"
  | "co-so-du-lieu"
  | "toeic"

export type LocalizedText = {
  en: string
  vi: string
}

export type ExamPaper = {
  id: string
  type: ExamType
  year: number
  questionCount: number
  durationMinutes: number
  title: LocalizedText
  description: LocalizedText
  /** Optional path to a local question-bank JSON file under /data */
  questionBank?: string
  /** Optional collection of question banks, combined into one grouped exam. */
  questionBanks?: string[]
}

export type ChapterOption = {
  id: string
  label: LocalizedText
  /** Chapter labels this option accepts (prefix-matched). Defaults to label.vi when omitted. */
  matches?: string[]
  /** When set, selecting this option opens the document (e.g. a PDF) instead of a quiz. */
  pdfUrl?: string
  count: number
}

export type Subject = {
  id: SubjectId
  code: string
  name: LocalizedText
  category: LocalizedText
  exams: ExamPaper[]
  chapters?: ChapterOption[]
}

export type ExamCatalogItem = ExamPaper & {
  subjectId: SubjectId
  subjectCode: string
  subjectName: LocalizedText
  category: LocalizedText
}

const securityName: LocalizedText = {
  en: "Application & System Security",
  vi: "Bảo mật ứng dụng và hệ thống",
}

const toeicName: LocalizedText = {
  en: "TOEIC Preparation",
  vi: "Luyện thi TOEIC",
}

export const subjects: Subject[] = [
  {
    id: "tieng-anh-dau-vao",
    code: "TADV01",
    name: { en: "English Placement Test", vi: "Tiếng Anh Đầu Vào" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "tadv-sample",
        type: "final",
        year: 2026,
        questionCount: 55,
        durationMinutes: 60,
        title: { en: "English Placement Sample Test", vi: "Đề mẫu Tiếng Anh Đầu Vào" },
        description: { en: "Sample test with 3 reference exams. Choose one after clicking Try now.", vi: "Đề mẫu gồm 3 đề tham khảo. Chọn 1 đề sau khi ấn Thử ngay." },
        questionBanks: ["/data/tadv/tadv-reading.json", "/data/tadv/tadv-listening.json"],
      },
    ],
  },
  {
    id: "tu-tuong-ho-chi-minh",
    code: "HCM101",
    name: { en: "Ho Chi Minh Ideology", vi: "Tư tưởng Hồ Chí Minh" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "hcm-final-bank-1", type: "final", year: 2026, questionCount: 456, durationMinutes: 60,
        title: { en: "Ho Chi Minh Ideology", vi: "Tư tưởng Hồ Chí Minh" },
        description: { en: "456 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "456 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/tu-tuong-hcm/cau_hoi_suu_tam.json",
          "/data/tu-tuong-hcm/chuong_1.json",
          "/data/tu-tuong-hcm/chuong_2.json",
          "/data/tu-tuong-hcm/chuong_3.json",
          "/data/tu-tuong-hcm/chuong_4.json",
          "/data/tu-tuong-hcm/chuong_5.json",
          "/data/tu-tuong-hcm/chuong_6.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (456 câu)" }, count: 456 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3"], count: 204 },
      { id: "c456_final", label: { en: "Chapters 4,5,6 - Final", vi: "Chương 4,5,6 - Cuối kỳ" }, matches: ["Chương 4","Chương 5","Chương 6"], count: 213 },
      { id: "suutam", label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" }, matches: ["Câu hỏi sưu tầm","Câu Hỏi Trong SLIDE"], count: 39 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 68 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 65 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 71 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 72 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 70 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 71 },
    ],
  },
  {
    id: "lich-su-dang-cong-san-viet-nam",
    code: "HIS101",
    name: { en: "History of the Communist Party of Vietnam", vi: "Lịch sử Đảng Cộng sản Việt Nam" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "history-party-final-bank-1", type: "final", year: 2026, questionCount: 288, durationMinutes: 60,
        title: { en: "History of the Communist Party of Vietnam", vi: "Lịch sử Đảng Cộng sản Việt Nam" },
        description: { en: "288 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "288 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/lich-su-dang/cau_hoi_suu_tam.json",
          "/data/lich-su-dang/chuong_1.json",
          "/data/lich-su-dang/chuong_2.json",
          "/data/lich-su-dang/chuong_3.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (288 câu)" }, count: 288 },
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, matches: ["Chương 1","Chương 2"], count: 165 },
      { id: "c3_final", label: { en: "Chapter 3 - Final", vi: "Chương 3 - Cuối kỳ" }, matches: ["Chương 3"], count: 63 },
      { id: "suutam", label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" }, matches: ["Câu hỏi sưu tầm","Câu Hỏi Trên Canvas","Chương Mất Gốc","Chương Nhập Môn"], count: 60 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 79 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 86 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 63 },
    ],
  },
  {
    id: "quan-tri-hoc",
    code: "MGT101",
    name: { en: "Management", vi: "Quản trị học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "management-final-bank-1", type: "final", year: 2026, questionCount: 450, durationMinutes: 60,
        title: { en: "Management", vi: "Quản trị học" },
        description: { en: "450 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "450 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/quan-tri-hoc/cau_hoi_suu_tam.json",
          "/data/quan-tri-hoc/chuong_1.json",
          "/data/quan-tri-hoc/chuong_2.json",
          "/data/quan-tri-hoc/chuong_3.json",
          "/data/quan-tri-hoc/chuong_4.json",
          "/data/quan-tri-hoc/chuong_5.json",
          "/data/quan-tri-hoc/chuong_6.json",
          "/data/quan-tri-hoc/chuong_7.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (450 câu)" }, count: 450 },
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3","Chương 4"], count: 162 },
      { id: "c567_final", label: { en: "Chapters 5,6,7 - Final", vi: "Chương 5,6,7 - Cuối kỳ" }, matches: ["Chương 5","Chương 6","Chương 7"], count: 109 },
      { id: "suutam", label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" }, count: 179 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 42 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 41 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 39 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 40 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 40 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 30 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, count: 39 },
    ],
  },
  {
    id: "triet-hoc-mac-lenin-2tc",
    code: "MLN101",
    name: { en: "Marxist-Leninist Philosophy (2 credits)", vi: "Triết học Mác - Lênin (2 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-2-credit-final-bank-1", type: "final", year: 2026, questionCount: 361, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (2 credits)", vi: "Triết học Mác - Lênin (2 tín chỉ)" },
        description: { en: "361 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "361 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/triet-hoc-mac-lenin/2tc/cau_hoi_suu_tam.json",
          "/data/triet-hoc-mac-lenin/2tc/chuong_1.json",
          "/data/triet-hoc-mac-lenin/2tc/chuong_2.json",
          "/data/triet-hoc-mac-lenin/2tc/chuong_3.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (361 câu)" }, count: 361 },
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, matches: ["Chương 1","Chương 2"], count: 116 },
      { id: "c3_final", label: { en: "Chapter 3 - Final", vi: "Chương 3 - Cuối kỳ" }, matches: ["Chương 3"], count: 67 },
      { id: "suutam", label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" }, count: 178 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 42 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 74 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 67 },
    ],
  },
  {
    id: "triet-hoc-mac-lenin-3tc",
    code: "MLN102",
    name: { en: "Marxist-Leninist Philosophy (3 credits)", vi: "Triết học Mác - Lênin (3 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-3-credit-final-bank-1", type: "final", year: 2026, questionCount: 210, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (3 credits)", vi: "Triết học Mác - Lênin (3 tín chỉ)" },
        description: { en: "210 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "210 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/triet-hoc-mac-lenin/3tc/cau_hoi_suu_tam.json",
          "/data/triet-hoc-mac-lenin/3tc/chuong_1.json",
          "/data/triet-hoc-mac-lenin/3tc/chuong_2.json",
          "/data/triet-hoc-mac-lenin/3tc/chuong_3.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (210 câu)" }, count: 210 },
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, matches: ["Chương 1","Chương 2"], count: 124 },
      { id: "c3_final", label: { en: "Chapter 3 - Final", vi: "Chương 3 - Cuối kỳ" }, matches: ["Chương 3"], count: 86 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 50 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 74 },
    ],
  },
  {
    id: "ky-nang-quan-ly-du-an",
    code: "PM101",
    name: { en: "Project Management Skills", vi: "Kỹ năng Quản lý Dự án" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "project-management-final-bank-1", type: "final", year: 2026, questionCount: 219, durationMinutes: 60,
        title: { en: "Project Management Skills", vi: "Kỹ năng Quản lý Dự án" },
        description: { en: "219 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "219 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/ky-nang-quan-ly-du-an/chuong_1.json",
          "/data/ky-nang-quan-ly-du-an/chuong_2.json",
          "/data/ky-nang-quan-ly-du-an/chuong_3.json",
          "/data/ky-nang-quan-ly-du-an/chuong_4.json",
          "/data/ky-nang-quan-ly-du-an/chuong_5.json",
          "/data/ky-nang-quan-ly-du-an/chuong_6.json",
          "/data/ky-nang-quan-ly-du-an/chuong_7.json",
          "/data/ky-nang-quan-ly-du-an/chuong_8.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (219 câu)" }, count: 219 },
      { id: "c12345_mid", label: { en: "Chapters 1,2,3,4,5 - Midterm", vi: "Chương 1,2,3,4,5 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3","Chương 4","Chương 5"], count: 141 },
      { id: "c678_final", label: { en: "Chapters 6,7,8 - Final", vi: "Chương 6,7,8 - Cuối kỳ" }, matches: ["Chương 6","Chương 7","Chương 8"], count: 78 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 32 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 37 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 35 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 19 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 18 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 22 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, count: 34 },
      { id: "c8", label: { en: "Chapter 8", vi: "Chương 8" }, count: 22 },
    ],
  },
  {
    id: "chu-nghia-xa-hoi-khoa-hoc",
    code: "SOC101",
    name: { en: "Scientific Socialism", vi: "Chủ nghĩa xã hội khoa học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "scientific-socialism-final-bank-1", type: "final", year: 2026, questionCount: 195, durationMinutes: 60,
        title: { en: "Scientific Socialism", vi: "Chủ nghĩa xã hội khoa học" },
        description: { en: "195 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "195 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_1.json",
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_2.json",
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_3.json",
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_4.json",
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_5.json",
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_6.json",
          "/data/chu-nghia-khoa-hoc-xa-hoi/chuong_7.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (195 câu)" }, count: 195 },
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3","Chương 4"], count: 103 },
      { id: "c567_final", label: { en: "Chapters 5,6,7 - Final", vi: "Chương 5,6,7 - Cuối kỳ" }, matches: ["Chương 5","Chương 6","Chương 7"], count: 92 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 24 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 30 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 27 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 22 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 34 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 30 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, count: 28 },
    ],
  },
  {
    id: "ky-nang-khoi-nghiep-va-lanh-dao",
    code: "ENT101",
    name: { en: "Entrepreneurship and Leadership Skills", vi: "Kỹ năng Khởi nghiệp và Lãnh đạo" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "entrepreneurship-leadership-final-bank-1", type: "final", year: 2026, questionCount: 112, durationMinutes: 60,
        title: { en: "Entrepreneurship and Leadership Skills", vi: "Kỹ năng Khởi nghiệp và Lãnh đạo" },
        description: { en: "112 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "112 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/ky-nang-khoi-nghiep-va-lanh-dao/chuong_1.json",
          "/data/ky-nang-khoi-nghiep-va-lanh-dao/chuong_2.json",
          "/data/ky-nang-khoi-nghiep-va-lanh-dao/chuong_3.json",
          "/data/ky-nang-khoi-nghiep-va-lanh-dao/chuong_4.json",
          "/data/ky-nang-khoi-nghiep-va-lanh-dao/chuong_5.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (112 câu)" }, count: 112 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3"], count: 70 },
      { id: "c45_final", label: { en: "Chapters 4,5 - Final", vi: "Chương 4,5 - Cuối kỳ" }, matches: ["Chương 4","Chương 5"], count: 42 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 15 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 25 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 30 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 24 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 18 },
    ],
  },
  {
    id: "danh-gia-va-kiem-dinh-chat-luong-phan-mem",
    code: "SQA101",
    name: { en: "Software Quality Assessment and Testing", vi: "Đánh giá và kiểm định chất lượng phần mềm" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "software-quality-assessment-final-bank-1", type: "final", year: 2026, questionCount: 299, durationMinutes: 60,
        title: { en: "Software Quality Assessment and Testing", vi: "Đánh giá và kiểm định chất lượng phần mềm" },
        description: { en: "299 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "299 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/danh_gia_va_kiem_dinh_chat_luong_phan_mem/chuong_1.json",
          "/data/danh_gia_va_kiem_dinh_chat_luong_phan_mem/chuong_2.json",
          "/data/danh_gia_va_kiem_dinh_chat_luong_phan_mem/chuong_3.json",
          "/data/danh_gia_va_kiem_dinh_chat_luong_phan_mem/chuong_4.json",
          "/data/danh_gia_va_kiem_dinh_chat_luong_phan_mem/chuong_5.json",
          "/data/danh_gia_va_kiem_dinh_chat_luong_phan_mem/chuong_6.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (299 câu)" }, count: 299 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3"], count: 165 },
      { id: "c456_final", label: { en: "Chapters 4,5,6 - Final", vi: "Chương 4,5,6 - Cuối kỳ" }, matches: ["Chương 4","Chương 5","Chương 6"], count: 134 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 49 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 97 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 19 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 20 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 74 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 40 },
    ],
  },
  {
    id: "kinh-te-vi-mo",
    code: "MAC101",
    name: { en: "Macroeconomics", vi: "Kinh tế vĩ mô" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "macroeconomics-final-bank-1", type: "final", year: 2026, questionCount: 181, durationMinutes: 60,
        title: { en: "Macroeconomics", vi: "Kinh tế vĩ mô" },
        description: { en: "181 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "181 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/kinh_te_vi_mo/chuong_1.json",
          "/data/kinh_te_vi_mo/chuong_2.json",
          "/data/kinh_te_vi_mo/chuong_3.json",
          "/data/kinh_te_vi_mo/chuong_4.json",
          "/data/kinh_te_vi_mo/chuong_5.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (181 câu)" }, count: 181 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3"], count: 126 },
      { id: "c45_final", label: { en: "Chapters 4,5 - Final", vi: "Chương 4,5 - Cuối kỳ" }, matches: ["Chương 4","Chương 5"], count: 55 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 50 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 41 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 35 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 25 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 30 },
    ],
  },
  {
    id: "kinh-te-chinh-tri-mac-lenin",
    code: "PEC101",
    name: { en: "Marxist-Leninist Political Economy", vi: "Kinh tế chính trị Mác - Lênin" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "political-economy-final-bank-1", type: "final", year: 2026, questionCount: 240, durationMinutes: 60,
        title: { en: "Marxist-Leninist Political Economy", vi: "Kinh tế chính trị Mác - Lênin" },
        description: { en: "240 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "240 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/kinh_te_chinh_tri_mac_lenin/chuong_1.json",
          "/data/kinh_te_chinh_tri_mac_lenin/chuong_2.json",
          "/data/kinh_te_chinh_tri_mac_lenin/chuong_3.json",
          "/data/kinh_te_chinh_tri_mac_lenin/chuong_4.json",
          "/data/kinh_te_chinh_tri_mac_lenin/chuong_5.json",
          "/data/kinh_te_chinh_tri_mac_lenin/chuong_6.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (240 câu)" }, count: 240 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3"], count: 110 },
      { id: "c456_final", label: { en: "Chapters 4,5,6 - Final", vi: "Chương 4,5,6 - Cuối kỳ" }, matches: ["Chương 4","Chương 5","Chương 6"], count: 130 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 29 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 50 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 31 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 45 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 45 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 40 },
    ],
  },
  {
    id: "bao-mat-ung-dung-he-thong",
    code: "SEC301",
    name: securityName,
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "sec-final-bank-2", type: "final", year: 2026, questionCount: 150, durationMinutes: 90,
        title: { en: "Application & System Security", vi: "Bảo mật ứng dụng và hệ thống" },
        description: { en: "150 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "150 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/bao-mat-ung-dung-va-he-thong/chuong_1.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_2.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_3.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_4.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_5.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_6.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_7.json",
          "/data/bao-mat-ung-dung-va-he-thong/chuong_8.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (150 câu)" }, count: 150 },
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3","Chương 4"], count: 65 },
      { id: "c5678_final", label: { en: "Chapters 5,6,7,8 - Final", vi: "Chương 5,6,7,8 - Cuối kỳ" }, matches: ["Chương 5","Chương 6","Chương 7","Chương 8"], count: 85 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 21 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 8 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, count: 17 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, count: 19 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, count: 20 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, count: 31 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, count: 18 },
      { id: "c8", label: { en: "Chapter 8", vi: "Chương 8" }, count: 16 },
    ],
  },
  {
    id: "co-so-du-lieu",
    code: "DB101",
    name: { en: "Database", vi: "Cơ sở dữ liệu" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "database-final-bank-1", type: "final", year: 2026, questionCount: 150, durationMinutes: 60,
        title: { en: "Database", vi: "Cơ sở dữ liệu" },
        description: { en: "150 questions grouped by parts. Choose a part after clicking Try now.", vi: "150 câu hỏi được chia theo phần. Chọn phần sau khi ấn Thử ngay." },
        questionBanks: [
          "/data/co-so-du-lieu/phan_1.json",
          "/data/co-so-du-lieu/phan_2.json",
          "/data/co-so-du-lieu/phan_3.json",
        ],
      },
    ],
    chapters: [
      { id: "all", label: { en: "All parts", vi: "Toàn bộ (150 câu)" }, count: 150 },
      { id: "c1", label: { en: "Part 1 - CSDL Theory", vi: "Phần 1 - Lý thuyết CSDL (Khi đi thi sẽ là 2 câu Tự luận)" }, matches: ["Phần 1"], count: 50 },
      { id: "c2", label: { en: "Part 2 - SQL", vi: "Phần 2 - Trắc SQL (Khi đi thi sẽ là 12 câu Trắc nghiệm)" }, matches: ["Phần 2"], count: 50 },
      { id: "c3", label: { en: "Part 3 - Advanced CSDL & Applications", vi: "Phần 3 - CSDL mở rộng & ứng dụng (Khi đi thi sẽ là 8 câu Tự luận)" }, matches: ["Phần 3"], count: 50 },
      { id: "de-suutam", label: { en: "Collected exams from previous periods", vi: "Đề sưu tầm của các đợt thi trước" }, pdfUrl: "/data/co-so-du-lieu/De_thi_Co_so_du_lieu.pdf", count: 0 },
    ],
  },
  {
    id: "toeic",
    code: "TOEIC01",
    name: toeicName,
    category: { en: "TOEIC", vi: "TOEIC" },
    exams: [
      {
        id: "toeic-test-01",
        type: "final",
        year: 2026,
        questionCount: 200,
        durationMinutes: 120,
        title: {
          en: "TOEIC Practice Set 01",
          vi: "Bộ tài liệu ôn luyện TOEIC 01",
        },
        description: {
          en: "Full ETS 2026 format with 200 questions across Listening and Reading. Choose Full Test, skill-based or per-Part practice.",
          vi: "Chuẩn ETS 2026 với 200 câu Listening & Reading. Chọn Full Test, luyện theo kỹ năng hoặc theo từng Part.",
        },
      },
      {
        id: "toeic-test-02",
        type: "final",
        year: 2026,
        questionCount: 200,
        durationMinutes: 120,
        title: {
          en: "TOEIC Practice Set 02",
          vi: "Bộ tài liệu ôn luyện TOEIC 02",
        },
        description: {
          en: "Full ETS 2026 format with 200 questions across Listening and Reading. Choose Full Test, skill-based or per-Part practice.",
          vi: "Chuẩn ETS 2026 với 200 câu Listening & Reading. Chọn Full Test, luyện theo kỹ năng hoặc theo từng Part.",
        },
      },
      {
        id: "toeic-test-03",
        type: "final",
        year: 2026,
        questionCount: 200,
        durationMinutes: 120,
        title: {
          en: "TOEIC Practice Set 03",
          vi: "Bộ tài liệu ôn luyện TOEIC 03",
        },
        description: {
          en: "Full ETS 2026 format with 200 questions across Listening and Reading. Choose Full Test, skill-based or per-Part practice.",
          vi: "Chuẩn ETS 2026 với 200 câu Listening & Reading. Chọn Full Test, luyện theo kỹ năng hoặc theo từng Part.",
        },
      },
    ],
  },
]

export const examCatalog: ExamCatalogItem[] = subjects.flatMap((subject) =>
  subject.exams.map((exam) => ({
    ...exam,
    subjectId: subject.id,
    subjectCode: subject.code,
    subjectName: subject.name,
    category: subject.category,
  }))
)

export function getSubjectById(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId) ?? null
}

export function getExamTitle(
  exam: Pick<ExamPaper, "title">,
  lang: "en" | "vi"
) {
  return exam.title[lang]
}




