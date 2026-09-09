type ExamType = "midterm" | "final"

export type SubjectId =
  | "tieng-anh-dau-vao"
  | "tu-tuong-ho-chi-minh"
  | "lich-su-dang-cong-san-viet-nam-giua-ky"
  | "lich-su-dang-cong-san-viet-nam"
  | "quan-tri-hoc"
  | "quan-tri-hoc-giua-ky"
  | "triet-hoc-mac-lenin-2tc-giua-ky"
  | "triet-hoc-mac-lenin-3tc-giua-ky"
  | "triet-hoc-mac-lenin-2tc"
  | "triet-hoc-mac-lenin-3tc"
  | "tu-tuong-ho-chi-minh-giua-ky"
  | "ky-nang-quan-ly-du-an"
  | "chu-nghia-xa-hoi-khoa-hoc"
  | "chu-nghia-xa-hoi-khoa-hoc-giua-ky"
  | "danh-gia-va-kiem-dinh-chat-luong-phan-mem"
  | "kinh-te-vi-mo"
  | "kinh-te-vi-mo-macro"
  | "kinh-te-chinh-tri-mac-lenin-giua-ky"
  | "kinh-te-chinh-tri-mac-lenin"
  | "ky-nang-khoi-nghiep-va-lanh-dao"
  | "bao-mat-ung-dung-he-thong"
  | "marketing-can-ban"
  | "tin-hoc-van-phong"
  | "nguyen-ly-tai-chinh"
  | "lich-su-van-minh-the-gioi"
  | "kinh-te-hoc"
  | "phap-luat-dai-cuong"
  | "co-so-du-lieu"
  | "khoa-hoc-du-lieu-va-tri-tue-nhan-tao"
  | "nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao"
  | "vat-ly-1"
  | "phuong-phap-tinh-giua-ky"
  | "phuong-phap-tinh-cuoi-ky"
  | "giai-tich"
  | "dai-so-tuyen-tinh"
  | "xac-suat-thong-ke"
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
  /** Optional plain-text note (e.g. Luu-y.txt) shown above the document with its download. */
  noteUrl?: string
  /** When set, selecting this option opens the gated image viewer for a paid document set. */
  documentId?: string
  /** When true, the option stays available for filtering/counts but is hidden from the chapter picker. */
  hidden?: boolean
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
  vi: "Quiz ôn tập Giữa và Cuối kỳ - Bảo mật ứng dụng và hệ thống",
}

const toeicName: LocalizedText = {
  en: "TOEIC Preparation",
  vi: "Luyện thi TOEIC",
}

export const subjects: Subject[] = [
  {
    id: "tieng-anh-dau-vao",
    code: "TADV01",
    name: { en: "English Placement Mock Test", vi: "Thi thử Tiếng Anh Đầu Vào" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "tadv-sample",
        type: "final",
        year: 2026,
        questionCount: 55,
        durationMinutes: 60,
        title: { en: "English Placement Mock Test", vi: "Thi thử Tiếng Anh Đầu Vào" },
        description: { en: "Includes 3 reference tests; pick one to start.", vi: "Gồm 3 đề tham khảo, chọn 1 đề để làm bài." },
        questionBanks: ["/data/tadv/tadv-reading.json", "/data/tadv/tadv-listening.json"],
      },
    ],
  },
  {
    id: "tu-tuong-ho-chi-minh-giua-ky",
    code: "HCM100",
    name: { en: "Ho Chi Minh Ideology Midterm", vi: "Quiz ôn tập Giữa kỳ - Tư tưởng Hồ Chí Minh" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "hcm-midterm-bank-1", type: "midterm", year: 2026, questionCount: 276, durationMinutes: 60,
        title: { en: "Ho Chi Minh Ideology Midterm", vi: "Quiz ôn tập Giữa kỳ - Tư tưởng Hồ Chí Minh" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: [
          "/data/tu-tuong-hcm-giua-ky/tu_tuong_hcm_giua_ky.json",
        ],
      },
    ],
    chapters: [
      { id: "c1234_mid", label: { en: "Ho Chi Minh Ideology - Midterm (Chapters 1, 2, 3, 4)", vi: "Tư tưởng Hồ Chí Minh - Giữa kỳ" }, matches: ["Chương 1", "Chương 2", "Chương 3", "Chương 4"], count: 276 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1"], count: 68 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2"], count: 65 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3"], count: 71 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4"], count: 72 },
    ],
  },
  {
    id: "tu-tuong-ho-chi-minh",
    code: "HCM101",
    name: { en: "Ho Chi Minh Ideology", vi: "Quiz ôn tập Cuối kỳ - Tư tưởng Hồ Chí Minh" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "hcm-final-bank-1", type: "final", year: 2026, questionCount: 456, durationMinutes: 60,
        title: { en: "Ho Chi Minh Ideology", vi: "Quiz ôn tập Cuối kỳ - Tư tưởng Hồ Chí Minh" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    id: "lich-su-dang-cong-san-viet-nam-giua-ky",
    code: "HIS100",
    name: { en: "History of the Communist Party of Vietnam Midterm", vi: "Quiz ôn tập Giữa kỳ - Lịch sử Đảng Cộng sản Việt Nam" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "history-party-midterm-bank-1", type: "midterm", year: 2026, questionCount: 165, durationMinutes: 60,
        title: { en: "History of the Communist Party of Vietnam Midterm", vi: "Quiz ôn tập Giữa kỳ - Lịch sử Đảng Cộng sản Việt Nam" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: ["/data/lich-su-dang-giua-ky/his_giua_ky.json"],
      },
    ],
    chapters: [
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, matches: ["Chương 1", "Chương 2"], count: 165 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, count: 79 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, count: 86 },
    ],
  },
  {
    id: "lich-su-dang-cong-san-viet-nam",
    code: "HIS101",
    name: { en: "History of the Communist Party of Vietnam", vi: "Quiz ôn tập Cuối kỳ - Lịch sử Đảng Cộng sản Việt Nam" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "history-party-final-bank-1", type: "final", year: 2026, questionCount: 288, durationMinutes: 60,
        title: { en: "History of the Communist Party of Vietnam", vi: "Quiz ôn tập Cuối kỳ - Lịch sử Đảng Cộng sản Việt Nam" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    id: "quan-tri-hoc-giua-ky",
    code: "MGT100",
    name: { en: "Management Midterm", vi: "Quiz ôn tập Giữa kỳ - Quản trị học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "mgt-midterm-bank-1", type: "midterm", year: 2026, questionCount: 162, durationMinutes: 60,
        title: { en: "Management Midterm", vi: "Quiz ôn tập Giữa kỳ - Quản trị học" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: [
          "/data/quan-tri-hoc-giua-ky/mgt_giua_ky.json",
        ],
      },
    ],
    chapters: [
      { id: "c1234_mid", label: { en: "Management - Midterm (Chapters 1, 2, 3, 4)", vi: "Quản trị học - Giữa kỳ" }, matches: ["Chương 1", "Chương 2", "Chương 3", "Chương 4"], count: 162 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1"], count: 42 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2"], count: 41 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3"], count: 39 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4"], count: 40 },
    ],
  },
  {
    id: "quan-tri-hoc",
    code: "MGT101",
    name: { en: "Management", vi: "Quiz ôn tập Cuối kỳ - Quản trị học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "management-final-bank-1", type: "final", year: 2026, questionCount: 450, durationMinutes: 60,
        title: { en: "Management", vi: "Quiz ôn tập Cuối kỳ - Quản trị học" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    id: "triet-hoc-mac-lenin-2tc-giua-ky",
    code: "MLN100",
    name: { en: "Marxist-Leninist Philosophy (2 credits) Midterm", vi: "Quiz ôn tập Giữa kỳ - Triết học Mác - Lênin (2 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-2-credit-midterm-bank-1", type: "midterm", year: 2026, questionCount: 116, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (2 credits) Midterm", vi: "Quiz ôn tập Giữa kỳ - Triết học Mác - Lênin (2 tín chỉ)" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: ["/data/triet-hoc-mac-lenin-2tc-giua-ky/mln_2tc_giua_ky.json"],
      },
    ],
    chapters: [
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, matches: ["Chương 1", "Chương 2"], count: 116 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1"], count: 42 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2"], count: 74 },
    ],
  },
  {
    id: "triet-hoc-mac-lenin-3tc-giua-ky",
    code: "MLN103",
    name: { en: "Marxist-Leninist Philosophy (3 credits) Midterm", vi: "Quiz ôn tập Giữa kỳ - Triết học Mác - Lênin (3 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-3-credit-midterm-bank-1", type: "midterm", year: 2026, questionCount: 124, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (3 credits) Midterm", vi: "Quiz ôn tập Giữa kỳ - Triết học Mác - Lênin (3 tín chỉ)" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: ["/data/triet-hoc-mac-lenin-3tc-giua-ky/mln_3tc_giua_ky.json"],
      },
    ],
    chapters: [
      { id: "c12_mid", label: { en: "Chapters 1,2 - Midterm", vi: "Chương 1,2 - Giữa kỳ" }, matches: ["Chương 1", "Chương 2"], count: 124 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1"], count: 50 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2"], count: 74 },
    ],
  },
  {
    id: "triet-hoc-mac-lenin-2tc",
    code: "MLN101",
    name: { en: "Marxist-Leninist Philosophy (2 credits)", vi: "Quiz ôn tập Cuối kỳ - Triết học Mác - Lênin (2 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-2-credit-final-bank-1", type: "final", year: 2026, questionCount: 361, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (2 credits)", vi: "Quiz ôn tập Cuối kỳ - Triết học Mác - Lênin (2 tín chỉ)" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    name: { en: "Marxist-Leninist Philosophy (3 credits)", vi: "Quiz ôn tập Cuối kỳ - Triết học Mác - Lênin (3 tín chỉ)" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "philosophy-3-credit-final-bank-1", type: "final", year: 2026, questionCount: 210, durationMinutes: 60,
        title: { en: "Marxist-Leninist Philosophy (3 credits)", vi: "Quiz ôn tập Cuối kỳ - Triết học Mác - Lênin (3 tín chỉ)" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    name: { en: "Project Management Skills", vi: "Quiz ôn tập - Kỹ năng Quản lý Dự án" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "project-management-final-bank-1", type: "final", year: 2026, questionCount: 219, durationMinutes: 60,
        title: { en: "Project Management Skills", vi: "Quiz ôn tập - Kỹ năng Quản lý Dự án" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    id: "chu-nghia-xa-hoi-khoa-hoc-giua-ky",
    code: "SOC100",
    name: { en: "Scientific Socialism Midterm", vi: "Quiz ôn tập Giữa kỳ - Chủ nghĩa xã hội khoa học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "scientific-socialism-midterm-bank-1", type: "midterm", year: 2026, questionCount: 103, durationMinutes: 60,
        title: { en: "Scientific Socialism Midterm", vi: "Quiz ôn tập Giữa kỳ - Chủ nghĩa xã hội khoa học" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: [
          "/data/chu-nghia-khoa-hoc-xa-hoi-giua-ky/soc_giua_ky.json",
        ],
      },
    ],
    chapters: [
      { id: "c1234_mid", label: { en: "Scientific Socialism - Midterm", vi: "Chủ nghĩa xã hội khoa học - Giữa kỳ" }, matches: ["Chương 1", "Chương 2", "Chương 3", "Chương 4"], count: 103 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1"], count: 24 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2"], count: 30 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3"], count: 27 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4"], count: 22 },
    ],
  },
  {
    id: "chu-nghia-xa-hoi-khoa-hoc",
    code: "SOC101",
    name: { en: "Scientific Socialism", vi: "Quiz ôn tập Cuối kỳ - Chủ nghĩa xã hội khoa học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "scientific-socialism-final-bank-1", type: "final", year: 2026, questionCount: 195, durationMinutes: 60,
        title: { en: "Scientific Socialism", vi: "Quiz ôn tập Cuối kỳ - Chủ nghĩa xã hội khoa học" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    name: { en: "Entrepreneurship and Leadership Skills", vi: "Quiz ôn tập - Kỹ năng Khởi nghiệp và Lãnh đạo" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "entrepreneurship-leadership-final-bank-1", type: "final", year: 2026, questionCount: 112, durationMinutes: 60,
        title: { en: "Entrepreneurship and Leadership Skills", vi: "Quiz ôn tập - Kỹ năng Khởi nghiệp và Lãnh đạo" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    name: { en: "Software Quality Assessment and Testing", vi: "Quiz ôn tập Cuối kỳ - Đánh giá và kiểm định chất lượng phần mềm" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "software-quality-assessment-final-bank-1", type: "final", year: 2026, questionCount: 299, durationMinutes: 60,
        title: { en: "Software Quality Assessment and Testing", vi: "Quiz ôn tập Cuối kỳ - Đánh giá và kiểm định chất lượng phần mềm" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "Software Quality Assessment and Testing - Final", vi: "Đánh giá và kiểm định chất lượng phần mềm - Cuối kỳ" }, count: 299 },
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
    name: { en: "Microeconomics", vi: "Quiz ôn tập - Kinh tế vi mô" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "macroeconomics-final-bank-1", type: "final", year: 2026, questionCount: 181, durationMinutes: 60,
        title: { en: "Microeconomics", vi: "Quiz ôn tập - Kinh tế vi mô" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    id: "kinh-te-vi-mo-macro",
    code: "MAC102",
    name: { en: "Macroeconomics", vi: "Quiz ôn tập Cuối kỳ - Kinh tế vĩ mô" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "kinh-te-vi-mo-macro-bank-1", type: "final", year: 2026, questionCount: 183, durationMinutes: 60,
        title: { en: "Macroeconomics", vi: "Quiz ôn tập Cuối kỳ - Kinh tế vĩ mô" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "Macroeconomics - Final", vi: "Kinh tế vĩ mô - Cuối kỳ" }, count: 183 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Kinh tế vĩ mô"], hidden: true, count: 183 },
    ],
  },
  {
    id: "kinh-te-chinh-tri-mac-lenin-giua-ky",
    code: "PEC100",
    name: { en: "Marxist-Leninist Political Economy Midterm", vi: "Quiz ôn tập Giữa kỳ - Kinh tế chính trị Mác - Lênin" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "political-economy-midterm-bank-1", type: "midterm", year: 2026, questionCount: 155, durationMinutes: 60,
        title: { en: "Marxist-Leninist Political Economy Midterm", vi: "Quiz ôn tập Giữa kỳ - Kinh tế chính trị Mác - Lênin" },
        description: { en: "Midterm set with chapter-by-chapter practice.", vi: "Bộ đề Giữa kỳ, ôn luyện theo từng chương." },
        questionBanks: ["/data/kinh-te-chinh-tri-mac-lenin-giua-ky/pec_giua_ky.json"],
      },
    ],
    chapters: [
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, matches: ["Chương 1", "Chương 2", "Chương 3", "Chương 4"], count: 155 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1"], count: 29 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2"], count: 50 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3"], count: 31 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4"], count: 45 },
    ],
  },
  {
    id: "kinh-te-chinh-tri-mac-lenin",
    code: "PEC101",
    name: { en: "Marxist-Leninist Political Economy", vi: "Quiz ôn tập Cuối kỳ - Kinh tế chính trị Mác - Lênin" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "political-economy-final-bank-1", type: "final", year: 2026, questionCount: 240, durationMinutes: 60,
        title: { en: "Marxist-Leninist Political Economy", vi: "Quiz ôn tập Cuối kỳ - Kinh tế chính trị Mác - Lênin" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "All chapters", vi: "Toàn bộ (240 câu)" }, count: 240 },
      { id: "c1234_mid", label: { en: "Chapters 1,2,3,4 - Midterm", vi: "Chương 1,2,3,4 - Giữa kỳ" }, matches: ["Chương 1","Chương 2","Chương 3","Chương 4"], count: 155 },
      { id: "c56_final", label: { en: "Chapters 5,6 - Final", vi: "Chương 5,6 - Cuối kỳ" }, matches: ["Chương 5","Chương 6"], count: 85 },
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
        title: { en: "Application & System Security", vi: "Quiz ôn tập Giữa và Cuối kỳ - Bảo mật ứng dụng và hệ thống" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
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
    id: "marketing-can-ban",
    code: "MAR101",
    name: { en: "Principles of Marketing", vi: "Quiz ôn tập Cuối kỳ - Marketing căn bản" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "marketing-final-bank-1", type: "final", year: 2026, questionCount: 478, durationMinutes: 60,
        title: { en: "Principles of Marketing", vi: "Quiz ôn tập Cuối kỳ - Marketing căn bản" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "Principles of Marketing - Final", vi: "Marketing căn bản - Cuối kỳ" }, count: 478 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1. Tổng quan về Marketing"], count: 86 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2. Nghiên cứu Marketing"], count: 64 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3. Môi trường Marketing"], count: 63 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4. Hành vi khách hàng"], count: 74 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, matches: ["Chương 5. Quy trình STP"], count: 79 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, matches: ["Chương 6. Chính sách sản phẩm"], count: 30 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, matches: ["Chương 7. Chính sách giá"], count: 28 },
      { id: "c8", label: { en: "Chapter 8", vi: "Chương 8" }, matches: ["Chương 8. Chính sách phân phối"], count: 25 },
      { id: "c9", label: { en: "Chapter 9", vi: "Chương 9" }, matches: ["Chương 9. Chính sách xúc tiến"], count: 29 },
    ],
  },
  {
    id: "tin-hoc-van-phong",
    code: "OIT101",
    name: { en: "Office Information Technology", vi: "Quiz ôn tập Cuối kỳ - Tin học văn phòng" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "office-it-final-bank-1", type: "final", year: 2026, questionCount: 309, durationMinutes: 60,
        title: { en: "Office Information Technology", vi: "Quiz ôn tập Cuối kỳ - Tin học văn phòng" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "Office Computing - Final", vi: "Tin học văn phòng - Cuối kỳ" }, count: 309 },
      { id: "c1", label: { en: "Part 1", vi: "Phần 1" }, matches: ["Phần 1"], count: 77 },
      { id: "c2", label: { en: "Part 2", vi: "Phần 2" }, matches: ["Phần 2"], count: 77 },
      { id: "c3", label: { en: "Part 3", vi: "Phần 3" }, matches: ["Phần 3"], count: 78 },
      { id: "c4", label: { en: "Part 4", vi: "Phần 4" }, matches: ["Phần 4"], count: 77 },
    ],
  },
  {
    id: "nguyen-ly-tai-chinh",
    code: "FIN101",
    name: { en: "Principles of Finance", vi: "Quiz ôn tập Cuối kỳ - Nguyên lý tài chính" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "finance-final-bank-1", type: "final", year: 2026, questionCount: 171, durationMinutes: 60,
        title: { en: "Principles of Finance", vi: "Quiz ôn tập Cuối kỳ - Nguyên lý tài chính" },
        description: { en: "Practice by chapter, including midterm content.", vi: "Ôn luyện theo từng chương, bao gồm cả nội dung Giữa kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "Principles of Finance - Final", vi: "Nguyên lý tài chính - Cuối kỳ" }, count: 171 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Nguyên lý Tài chính"], hidden: true, count: 171 },
    ],
  },
  {
    id: "lich-su-van-minh-the-gioi",
    code: "CIV101",
    name: { en: "World Civilization History", vi: "Quiz ôn tập Giữa và Cuối kỳ - Lịch sử văn minh thế giới" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "world-civilization-chapters-1-2-bank-1", type: "final", year: 2026, questionCount: 185, durationMinutes: 60,
        title: { en: "World Civilization History", vi: "Quiz ôn tập Giữa và Cuối kỳ - Lịch sử văn minh thế giới" },
        description: { en: "Includes Midterm and Final sets.", vi: "Gồm 2 bộ đề Giữa kỳ và Cuối kỳ." },
      },
    ],
    chapters: [
      { id: "all", label: { en: "World Civilization History - Midterm & Final", vi: "Lịch sử văn minh thế giới - Giữa và Cuối kỳ" }, count: 185 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Lịch sử văn minh thế giới"], hidden: true, count: 185 },
    ],
  },
  {
    id: "kinh-te-hoc",
    code: "ECO101",
    name: { en: "Economics", vi: "Quiz ôn tập Giữa và Cuối kỳ - Kinh tế học" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "economics-bank-1", type: "final", year: 2026, questionCount: 215, durationMinutes: 60,
        title: { en: "Economics", vi: "Quiz ôn tập Giữa và Cuối kỳ - Kinh tế học" },
        description: { en: "Includes Midterm and Final sets.", vi: "Gồm 2 bộ đề Giữa kỳ và Cuối kỳ." },
      },
    ],
    chapters: [
      { id: "c1234_mid", label: { en: "Economics - Midterm (Chapters 1, 2, 3, 4)", vi: "Kinh tế học - Giữa kỳ (Chương 1, 2, 3, 4)" }, matches: ["Chương 1.", "Chương 2.", "Chương 3.", "Chương 4."], count: 163 },
      { id: "c567_final", label: { en: "Economics - Final (Chapters 5, 6, 7)", vi: "Kinh tế học - Cuối kỳ (Chương 5, 6, 7)" }, matches: ["Chương 5.", "Chương 6.", "Chương 7."], count: 52 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1."], hidden: true, count: 21 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2."], hidden: true, count: 66 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3."], hidden: true, count: 40 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4."], hidden: true, count: 36 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, matches: ["Chương 5."], hidden: true, count: 17 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, matches: ["Chương 6."], hidden: true, count: 20 },
      { id: "c7", label: { en: "Chapter 7", vi: "Chương 7" }, matches: ["Chương 7."], hidden: true, count: 15 },
    ],
  },
  {
    id: "phap-luat-dai-cuong",
    code: "LAW101",
    name: { en: "Introduction to Law", vi: "Quiz ôn tập Giữa và Cuối kỳ - Pháp luật đại cương" },
    category: { en: "General", vi: "Đại cương" },
    exams: [
      {
        id: "phap-luat-dai-cuong-bank-1", type: "final", year: 2026, questionCount: 716, durationMinutes: 60,
        title: { en: "Introduction to Law", vi: "Quiz ôn tập Giữa và Cuối kỳ - Pháp luật đại cương" },
        description: { en: "Includes Midterm and Final sets.", vi: "Gồm 2 bộ đề Giữa kỳ và Cuối kỳ." },
      },
    ],
    chapters: [
      { id: "c1234_mid", label: { en: "Introduction to Law - Midterm (Chapters 1, 2, 3, 4)", vi: "Pháp luật đại cương - Giữa kỳ (Chương 1, 2, 3, 4)" }, matches: ["Chương 1.", "Chương 2.", "Chương 3.", "Chương 4."], count: 431 },
      { id: "c56_final", label: { en: "Introduction to Law - Final (Chapters 5, 6)", vi: "Pháp luật đại cương - Cuối kỳ (Chương 5, 6)" }, matches: ["Chương 5.", "Chương 6."], count: 285 },
      { id: "c1", label: { en: "Chapter 1", vi: "Chương 1" }, matches: ["Chương 1."], count: 73 },
      { id: "c2", label: { en: "Chapter 2", vi: "Chương 2" }, matches: ["Chương 2."], count: 96 },
      { id: "c3", label: { en: "Chapter 3", vi: "Chương 3" }, matches: ["Chương 3."], count: 175 },
      { id: "c4", label: { en: "Chapter 4", vi: "Chương 4" }, matches: ["Chương 4."], count: 87 },
      { id: "c5", label: { en: "Chapter 5", vi: "Chương 5" }, matches: ["Chương 5."], count: 159 },
      { id: "c6", label: { en: "Chapter 6", vi: "Chương 6" }, matches: ["Chương 6."], count: 126 },
    ],
  },
  {
    id: "co-so-du-lieu",
    code: "DB101",
    name: { en: "Database", vi: "Quiz và Đề ôn tập Cuối kỳ - Cơ sở dữ liệu" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "database-final-bank-1", type: "final", year: 2026, questionCount: 150, durationMinutes: 60,
        title: { en: "Database", vi: "Quiz và Đề ôn tập Cuối kỳ - Cơ sở dữ liệu" },
        description: { en: "Practice by part: theory, SQL and applications.", vi: "Ôn theo từng phần: lý thuyết, SQL và ứng dụng." },
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
    id: "khoa-hoc-du-lieu-va-tri-tue-nhan-tao",
    code: "DSAI101",
    name: { en: "Data Science and Artificial Intelligence", vi: "Quiz ôn tập Giữa và Cuối kỳ - Khoa học dữ liệu và Trí tuệ nhân tạo" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "data-science-ai-bank-1", type: "final", year: 2026, questionCount: 298, durationMinutes: 60,
        title: { en: "Data Science and Artificial Intelligence", vi: "Quiz ôn tập Giữa và Cuối kỳ - Khoa học dữ liệu và Trí tuệ nhân tạo" },
        description: { en: "Includes Midterm and Final sets.", vi: "Gồm 2 bộ đề Giữa kỳ và Cuối kỳ." },
      },
    ],
  },
  {
    id: "nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao",
    code: "IDSAI101",
    name: { en: "Intro Data Science & AI Practice Bank", vi: "Quiz ôn tập Cuối kỳ - Nhập môn Khoa học dữ liệu và Trí tuệ nhân tạo" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "intro-data-science-ai-bank-1", type: "final", year: 2026, questionCount: 119, durationMinutes: 60,
        title: { en: "Intro Data Science & AI Practice Bank", vi: "Quiz ôn tập Cuối kỳ - Nhập môn Khoa học dữ liệu và Trí tuệ nhân tạo" },
        description: { en: "Comprehensive final review set.", vi: "Bộ đề tổng hợp ôn tập Cuối kỳ." },
      },
    ],
  },
  {
    id: "giai-tich",
    code: "GT101",
    name: { en: "Calculus - Final", vi: "Đề Giải tích - Cuối kỳ" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "calculus-final-docs-1", type: "final", year: 2025, questionCount: 0, durationMinutes: 0,
        title: { en: "Calculus - Final", vi: "Đề Giải tích - Cuối kỳ" },
        description: { en: "View scanned exam papers and download each image.", vi: "Xem ảnh đề thi trực tiếp và tải từng hình ảnh." },
      },
    ],
    chapters: [
      { id: "de1", label: { en: "Calculus - Set 1", vi: "Giải tích - Đề 1" }, documentId: "cal-de-1", count: 1 },
      { id: "de2", label: { en: "Calculus - Set 2", vi: "Giải tích - Đề 2" }, documentId: "cal-de-2", count: 1 },
    ],
  },
  {
    id: "dai-so-tuyen-tinh",
    code: "DST101",
    name: { en: "Linear Algebra - Final", vi: "Đề Đại số tuyến tính - Cuối kỳ" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "dstt-final-docs-1", type: "final", year: 2023, questionCount: 0, durationMinutes: 0,
        title: { en: "Linear Algebra - Final", vi: "Đề Đại số tuyến tính - Cuối kỳ" },
        description: { en: "View scanned exam papers and download each image.", vi: "Xem ảnh đề thi trực tiếp và tải từng hình ảnh." },
      },
    ],
    chapters: [
      { id: "de1", label: { en: "Linear Algebra - Set 1", vi: "Đại số tuyến tính - Đề 1" }, documentId: "dst-de-1", count: 1 },
    ],
  },
  {
    id: "xac-suat-thong-ke",
    code: "XST101",
    name: { en: "Probability & Statistics - Midterm", vi: "Đề Xác suất thống kê - Giữa kỳ" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "xstk-midterm-docs-1", type: "midterm", year: 2025, questionCount: 0, durationMinutes: 0,
        title: { en: "Probability & Statistics - Midterm", vi: "Đề Xác suất thống kê - Giữa kỳ" },
        description: { en: "View scanned exam papers and download each image.", vi: "Xem ảnh đề thi trực tiếp và tải từng hình ảnh." },
      },
    ],
    chapters: [
      { id: "de1", label: { en: "Probability & Statistics - Midterm Set 1", vi: "Xác suất thống kê - Đề Giữa kỳ" }, documentId: "xstk-de-1", count: 1 },
    ],
  },
  {
    id: "phuong-phap-tinh-giua-ky",
    code: "PPT101",
    name: { en: "Numerical Methods - Midterm", vi: "Đề Phương pháp tính - Giữa kỳ" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "ppt-midterm-docs-1", type: "midterm", year: 2025, questionCount: 0, durationMinutes: 0,
        title: { en: "Numerical Methods - Midterm", vi: "Đề Phương pháp tính - Giữa kỳ" },
        description: { en: "View scanned exam papers and download each image.", vi: "Xem ảnh đề thi trực tiếp và tải từng hình ảnh." },
      },
    ],
    chapters: [
      { id: "de1", label: { en: "Numerical Methods - Midterm Set 1", vi: "Phương pháp tính - Đề Giữa kỳ" }, documentId: "ppt-mid-de-1", count: 1 },
    ],
  },
  {
    id: "phuong-phap-tinh-cuoi-ky",
    code: "PPT102",
    name: { en: "Numerical Methods - Final", vi: "Đề Phương pháp tính - Cuối kỳ" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "ppt-final-docs-1", type: "final", year: 2025, questionCount: 0, durationMinutes: 0,
        title: { en: "Numerical Methods - Final", vi: "Đề Phương pháp tính - Cuối kỳ" },
        description: { en: "View scanned exam papers and download each image.", vi: "Xem ảnh đề thi trực tiếp và tải từng hình ảnh." },
      },
    ],
    chapters: [
      { id: "de1", label: { en: "Numerical Methods - Final Set 1", vi: "Phương pháp tính - Đề Cuối kỳ 1" }, documentId: "ppt-final-de-1", count: 1 },
      { id: "de2", label: { en: "Numerical Methods - Final Set 2", vi: "Phương pháp tính - Đề Cuối kỳ 2" }, documentId: "ppt-final-de-2", count: 1 },
    ],
  },
  {
    id: "vat-ly-1",
    code: "PHY101",
    name: { en: "Physics 1 - Final", vi: "Đề Vật Lý 1 - Cuối kỳ" },
    category: { en: "Major", vi: "Chuyên ngành" },
    exams: [
      {
        id: "physics-1-final-docs-1", type: "final", year: 2025, questionCount: 0, durationMinutes: 0,
        title: { en: "Physics 1 - Final", vi: "Đề Vật Lý 1 - Cuối kỳ" },
        description: { en: "View scanned exam papers and download each image.", vi: "Xem ảnh đề thi trực tiếp và tải từng hình ảnh." },
      },
    ],
    chapters: [
      { id: "de1", label: { en: "Physics 1 - Set 1", vi: "Vật lý 1 - Đề 1" }, documentId: "phy-de-1", count: 2 },
      { id: "de2", label: { en: "Physics 1 - Set 2", vi: "Vật lý 1 - Đề 2" }, documentId: "phy-de-2", count: 2 },
      { id: "de3", label: { en: "Physics 1 - Set 3", vi: "Vật lý 1 - Đề 3" }, documentId: "phy-de-3", count: 2 },
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
          en: "ETS 2026 format: Full Test, skills or per-Part practice.",
          vi: "Chuẩn ETS 2026: Full Test, luyện kỹ năng hoặc theo Part.",
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
          en: "ETS 2026 format: Full Test, skills or per-Part practice.",
          vi: "Chuẩn ETS 2026: Full Test, luyện kỹ năng hoặc theo Part.",
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
          en: "ETS 2026 format: Full Test, skills or per-Part practice.",
          vi: "Chuẩn ETS 2026: Full Test, luyện kỹ năng hoặc theo Part.",
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
