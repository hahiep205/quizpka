export type ExamType = "midterm" | "final"

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
  description: LocalizedText
  count: number
}

export type Subject = {
  id: string
  code: string
  name: LocalizedText
  category: LocalizedText
  exams: ExamPaper[]
  chapters?: ChapterOption[]
}

export type ExamCatalogItem = ExamPaper & {
  subjectId: string
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
        questionBanks: ["/data/tadv-reading.json", "/data/tadv-listening.json"],
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
        id: "hcm-final-bank-1", type: "final", year: 2026, questionCount: 680, durationMinutes: 60,
        title: { en: "Ho Chi Minh Ideology", vi: "Tư tưởng Hồ Chí Minh" },
        description: { en: "680 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "680 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBank: "/data/tu_tuong_ho_chi_minh.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (680 câu)" }, description: { en: "All 680 questions", vi: "Tất cả 680 câu hỏi" }, count: 680 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, description: { en: "294 questions", vi: "294 câu" }, count: 294 },
      { id: "c456_final", label: { en: "Chapters 4,5,6 - Final", vi: "Chương 4,5,6 - Cuối kỳ" }, description: { en: "347 questions", vi: "347 câu" }, count: 347 },
      { id: "suutam", label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" }, description: { en: "39 questions", vi: "39 câu" }, count: 39 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "89 questions", vi: "89 câu" }, count: 89 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "89 questions", vi: "89 câu" }, count: 89 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, description: { en: "115 questions", vi: "115 câu" }, count: 115 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, description: { en: "116 questions", vi: "116 câu" }, count: 116 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, description: { en: "116 questions", vi: "116 câu" }, count: 116 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, description: { en: "116 questions", vi: "116 câu" }, count: 116 },
    ],
  },
  {
    id: "lich-su-dang-cong-san-viet-nam",
    code: "HIS101",
    name: { en: "History of the Communist Party of Vietnam", vi: "Lịch sử Đảng Cộng sản Việt Nam" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "history-party-final-bank-1", type: "final", year: 2026, questionCount: 474, durationMinutes: 60,
        title: { en: "History of the Communist Party of Vietnam", vi: "Lịch sử Đảng Cộng sản Việt Nam" },
        description: { en: "474 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "474 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBank: "/data/lich_su_dang.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (474 câu)" }, description: { en: "All 474 questions", vi: "Tất cả 474 câu hỏi" }, count: 474 },
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, description: { en: "283 questions", vi: "283 câu" }, count: 283 },
      { id: "c3_final", label: { en: "Chapter 3 - Final", vi: "Chương 3 - Cuối kỳ" }, description: { en: "119 questions", vi: "119 câu" }, count: 119 },
      { id: "suutam", label: { en: "Collected Questions", vi: "Câu hỏi sưu tầm" }, description: { en: "72 questions", vi: "72 câu" }, count: 72 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "144 questions", vi: "144 câu" }, count: 144 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "139 questions", vi: "139 câu" }, count: 139 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, description: { en: "119 questions", vi: "119 câu" }, count: 119 },
    ],
  },
  {
    id: "quan-tri-hoc",
    code: "MGT101",
    name: { en: "Management", vi: "Quản trị học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "management-final-bank-1", type: "final", year: 2026, questionCount: 456, durationMinutes: 60,
        title: { en: "Management", vi: "Quản trị học" },
        description: { en: "456 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "456 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBank: "/data/quan_tri_hoc.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (456 câu)" }, description: { en: "All 456 questions", vi: "Tất cả 456 câu hỏi" }, count: 456 },
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, description: { en: "244 questions", vi: "244 câu" }, count: 244 },
      { id: "c567_final", label: { en: "Chapters 5,6,7 - Final", vi: "Chương 5,6,7 - Cuối kỳ" }, description: { en: "212 questions", vi: "212 câu" }, count: 212 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "42 questions", vi: "42 câu" }, count: 42 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "41 questions", vi: "41 câu" }, count: 41 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, description: { en: "39 questions", vi: "39 câu" }, count: 39 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, description: { en: "40 questions", vi: "40 câu" }, count: 40 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, description: { en: "40 questions", vi: "40 câu" }, count: 40 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, description: { en: "30 questions", vi: "30 câu" }, count: 30 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, description: { en: "39 questions", vi: "39 câu" }, count: 39 },
    ],
  },
  {
    id: "triet-hoc-mac-lenin-2tc",
    code: "MLN101",
    name: { en: "Marxist-Leninist Philosophy (2 credits)", vi: "Triết học Mác - Lênin (2 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-2-credit-final-bank-1", type: "final", year: 2026, questionCount: 362, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (2 credits)", vi: "Triết học Mác - Lênin (2 tín chỉ)" },
        description: { en: "362 questions grouped by chapters. Choose a chapter after clicking Try now.", vi: "362 câu hỏi được chia theo chương. Chọn chương sau khi ấn Thử ngay." },
        questionBank: "/data/triet_hoc_mac_lenin_2tc.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (362 câu)" }, description: { en: "All 362 questions", vi: "Tất cả 362 câu hỏi" }, count: 362 },
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, description: { en: "231 questions", vi: "231 câu" }, count: 231 },
      { id: "c3_final", label: { en: "Chapter 3 - Final", vi: "Chương 3 - Cuối kỳ" }, description: { en: "131 questions", vi: "131 câu" }, count: 131 },
      { id: "slide", label: { en: "Lecture Slides", vi: "Câu hỏi trong Slide Bài Giảng" }, description: { en: "44 questions", vi: "44 câu" }, count: 44 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "42 questions", vi: "42 câu" }, count: 42 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "74 questions", vi: "74 câu" }, count: 74 },
      { id: "c123_03", label: { en: "Chapters 1,2,3 - 0.3 pts", vi: "Chương 1,2,3 câu 0,3 điểm" }, description: { en: "64 questions", vi: "64 câu" }, count: 64 },
      { id: "c12_035", label: { en: "Chapters 1,2 - 0.35-0.4 pts", vi: "Chương 1,2 câu 0,35-0.4 điểm" }, description: { en: "71 questions", vi: "71 câu" }, count: 71 },
      { id: "c3_035", label: { en: "Chapter 3 - 0.35 pts", vi: "Chương 3 câu 0,35 điểm" }, description: { en: "67 questions", vi: "67 câu" }, count: 67 },
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
        questionBank: "/data/triet_hoc_mac_lenin_3tc.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (210 câu)" }, description: { en: "All 210 questions", vi: "Tất cả 210 câu hỏi" }, count: 210 },
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, description: { en: "124 questions", vi: "124 câu" }, count: 124 },
      { id: "c3_final", label: { en: "Chapter 3 - Final", vi: "Chương 3 - Cuối kỳ" }, description: { en: "86 questions", vi: "86 câu" }, count: 86 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "50 questions", vi: "50 câu" }, count: 50 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "74 questions", vi: "74 câu" }, count: 74 },
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
        questionBank: "/data/ky_nang_quan_ly_du_an.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (219 câu)" }, description: { en: "All 219 questions", vi: "Tất cả 219 câu hỏi" }, count: 219 },
      { id: "c12345_mid", label: { en: "Chapters 1,2,3,4,5 - Midterm", vi: "Chương 1,2,3,4,5 - Giữa kỳ" }, description: { en: "141 questions", vi: "141 câu" }, count: 141 },
      { id: "c678_final", label: { en: "Chapters 6,7,8 - Final", vi: "Chương 6,7,8 - Cuối kỳ" }, description: { en: "78 questions", vi: "78 câu" }, count: 78 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "29 questions", vi: "29 câu" }, count: 29 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, description: { en: "26 questions", vi: "26 câu" }, count: 26 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, description: { en: "26 questions", vi: "26 câu" }, count: 26 },
      { id: "c8", label: { en: "Chapter 8", vi: "Chương 8" }, description: { en: "26 questions", vi: "26 câu" }, count: 26 },
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
        questionBank: "/data/chu_nghia_xa_hoi_khoa_hoc.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (195 câu)" }, description: { en: "All 195 questions", vi: "Tất cả 195 câu hỏi" }, count: 195 },
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, description: { en: "112 questions", vi: "112 câu" }, count: 112 },
      { id: "c567_final", label: { en: "Chapters 5,6,7 - Final", vi: "Chương 5,6,7 - Cuối kỳ" }, description: { en: "83 questions", vi: "83 câu" }, count: 83 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, description: { en: "28 questions", vi: "28 câu" }, count: 28 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, description: { en: "27 questions", vi: "27 câu" }, count: 27 },
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
        questionBank: "/data/ky_nang_khoi_nghiep_va_lanh_dao.json",
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (112 câu)" }, description: { en: "All 112 questions", vi: "Tất cả 112 câu hỏi" }, count: 112 },
      { id: "c123_mid", label: { en: "Chapters 1,2,3 - Midterm", vi: "Chương 1,2,3 - Giữa kỳ" }, description: { en: "70 questions", vi: "70 câu" }, count: 70 },
      { id: "c45_final", label: { en: "Chapters 4,5 - Final", vi: "Chương 4,5 - Cuối kỳ" }, description: { en: "42 questions", vi: "42 câu" }, count: 42 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, description: { en: "24 questions", vi: "24 câu" }, count: 24 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, description: { en: "23 questions", vi: "23 câu" }, count: 23 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, description: { en: "23 questions", vi: "23 câu" }, count: 23 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, description: { en: "21 questions", vi: "21 câu" }, count: 21 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, description: { en: "21 questions", vi: "21 câu" }, count: 21 },
    ],
  },
  {
    id: "bao-mat-ung-dung-he-thong",
    code: "SEC301",
    name: securityName,
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "sec-final-bank-2",
        type: "final",
        year: 2025,
        questionCount: 150,
        durationMinutes: 90,
        title: {
          en: "Practice Final Exam - Application & System Security – 2026",
          vi: "Đề tham khảo Cuối kỳ môn Bảo mật ứng dụng và hệ thống – 2026",
        },
        description: {
          en: "Full practice final exam bank with 150 multiple-choice questions on application and system security.",
          vi: "Bộ tài liệu ôn tập cuối kỳ đầy đủ 150 câu trắc nghiệm về bảo mật ứng dụng và hệ thống.",
        },
        questionBank: "/data/bo_cau_hoi_bao_mat_ung_dung_he_thong_2.json",
      },
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
          en: "Full ETS 2024 format with 200 questions across Listening and Reading. Choose Full Test, skill-based or per-Part practice.",
          vi: "Chuẩn ETS 2024 với 200 câu Listening & Reading. Chọn Full Test, luyện theo kỹ năng hoặc theo từng Part.",
        },
        questionBanks: [
          "/data/toeic-test/Test-01/Part1/test01-part1.json",
          "/data/toeic-test/Test-01/Part2/part2.json",
          "/data/toeic-test/Test-01/Part3/part3.json",
          "/data/toeic-test/Test-01/Part4/part4.json",
          "/data/toeic-test/Test-01/Part5/part5.json",
          "/data/toeic-test/Test-01/Part6/part6.json",
          "/data/toeic-test/Test-01/Part7/part7.json",
        ],
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
