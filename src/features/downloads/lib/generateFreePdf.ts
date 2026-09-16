import * as pdfMakeModule from "pdfmake/build/pdfmake"
import type { Content, TableCell } from "pdfmake/build/pdfmake"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import * as vfsModule from "pdfmake/build/vfs_fonts"
import type { PdfQuestion } from "./fetchFreePdfData"
import type { ExamCatalogItem, Subject } from "@/data/subjects"

const TEXT = "#111827"
const MUTED = "#6B7280"

// Tinos (Apache 2.0) — metric-compatible với Times New Roman, hỗ trợ tiếng Việt.
// Dùng qua URL protocol của pdfmake để không cần bundle font proprietary.
const TIMES_FONT_BASE = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos"
const TIMES_NEW_ROMAN_URLS = {
  normal: `${TIMES_FONT_BASE}/Tinos-Regular.ttf`,
  bold: `${TIMES_FONT_BASE}/Tinos-Bold.ttf`,
  italics: `${TIMES_FONT_BASE}/Tinos-Italic.ttf`,
  bolditalics: `${TIMES_FONT_BASE}/Tinos-BoldItalic.ttf`,
} as const

// Lề: trên 2.5cm, dưới 1.5cm, trái 2cm, phải 2cm (1cm ≈ 28.35pt).
const MARGIN_LEFT = 57
const MARGIN_TOP = 71
const MARGIN_RIGHT = 57
const MARGIN_BOTTOM = 43
const BODY_FONT = "TimesNewRoman"
const FALLBACK_FONT = "Roboto"

type PdfMakeDoc = TDocumentDefinitions & { defaultStyle: { font: string } }

type CoverTocGroup = { group: string; qRef: string; aRef: string }

// pdfmake's browser build needs its VFS registered explicitly when bundled by Vite.
// This embeds Roboto in the generated PDF, including Vietnamese diacritics.
const vfs = (vfsModule as unknown as { default?: Record<string, string> }).default ?? (vfsModule as unknown as Record<string, string>)
const pdfMakeCandidates = [
  pdfMakeModule,
  (pdfMakeModule as unknown as { default?: unknown }).default,
  ((pdfMakeModule as unknown as { default?: { default?: unknown } }).default)?.default,
].filter(Boolean) as unknown[]
const pdfMake = pdfMakeCandidates.find((candidate) => typeof (candidate as { addVirtualFileSystem?: unknown }).addVirtualFileSystem === "function") as {
  addVirtualFileSystem: (files: Record<string, string>) => void
  createPdf: (definition: PdfMakeDoc) => { getBlob: () => Promise<Blob> }
}
const pdfMakeApi = pdfMake as unknown as {
  addVirtualFileSystem: (files: Record<string, string>) => void
  addFonts: (fonts: Record<string, Record<string, string>>) => void
  createPdf: (definition: PdfMakeDoc) => { getBlob: () => Promise<Blob> }
}
pdfMakeApi.addVirtualFileSystem(vfs)
pdfMakeApi.addFonts({ [BODY_FONT]: { ...TIMES_NEW_ROMAN_URLS } })

export async function generateFreePdf(
  subject: Subject,
  _exam: ExamCatalogItem,
  chapterLabel: string,
  questions: PdfQuestion[],
  downloaderEmail: string | null = null,
): Promise<Blob> {
  const images = await loadQuestionImages(questions)
  const definition = buildDocumentDefinition(subject, chapterLabel, questions, images, downloaderEmail)
  // Keep the method call bound to the pdfMake object. pdfmake 0.3 stores
  // progress state on its module context, so destructuring createPdf breaks it.
  try {
    return await pdfMakeApi.createPdf(definition).getBlob()
  } catch (error) {
    // Nếu CDN font lỗi/offline, fallback Roboto (đã embed VFS) để vẫn có PDF.
    const fallback = { ...definition, defaultStyle: { ...(definition.defaultStyle as object), font: FALLBACK_FONT } } as PdfMakeDoc
    try {
      return await pdfMakeApi.createPdf(fallback).getBlob()
    } catch {
      throw error
    }
  }
}

function buildDocumentDefinition(
  subject: Subject,
  chapterLabel: string,
  questions: PdfQuestion[],
  images: Map<string, string>,
  downloaderEmail: string | null,
): PdfMakeDoc {
  const answerRows = makeAnswerRows(questions)
  // Gom nhãn Part/Chương: chỉ hiện 1 lần phía trên câu đầu tiên của mỗi nhóm.
  // Nếu toàn bộ tài liệu chỉ có 1 nhóm thì ẩn hẳn (không lặp ở từng câu).
  const groupNames = questions.map((q) => q.chapter ?? "")
  const distinctGroups = [...new Set(groupNames.filter(Boolean))]
  const showGroups = distinctGroups.length > 1
  const tocGroups: CoverTocGroup[] = []
  const seenQuestionGroups = new Set<string>()
  const questionContent: Content[] = []
  let prevGroup: string | null = null
  questions.forEach((question) => {
    const group = question.chapter ?? ""
    let blockId: string | undefined
    if (showGroups && group && group !== prevGroup) {
      questionContent.push({ text: group, style: "partTitle", margin: [0, 10, 0, 6] })
      prevGroup = group
      // Mỗi tên nhóm chỉ có đúng 1 entry mục lục (trỏ tới lần xuất hiện đầu tiên),
      // kể cả khi bank xếp các chương xen kẽ nhau. Nếu không, pageReference sẽ trỏ
      // tới id không bao giờ được gắn và pdfmake báo "Page reference id not found".
      if (!seenQuestionGroups.has(group)) {
        seenQuestionGroups.add(group)
        const entry: CoverTocGroup = { group, qRef: `toc-q-${tocGroups.length}`, aRef: `toc-a-${tocGroups.length}` }
        tocGroups.push(entry)
        blockId = entry.qRef
      }
    }
    questionContent.push(makeQuestionBlock(question, images, blockId))
  })
  const explanationContent: Content[] = []
  const explainedGroups = new Set<string>()
  questions.forEach((question) => {
    const group = question.chapter ?? ""
    let blockId: string | undefined
    if (showGroups && group && !explainedGroups.has(group)) {
      explainedGroups.add(group)
      blockId = tocGroups.find((t) => t.group === group)?.aRef
    }
    explanationContent.push(makeExplanationBlock(question, blockId))
  })

  return {
    pageSize: "A4",
    pageMargins: [MARGIN_LEFT, MARGIN_TOP, MARGIN_RIGHT, MARGIN_BOTTOM],
    // Chuẩn Word: cỡ 13, dãn dòng 1.5, mật độ chữ thường (không characterSpacing).
    defaultStyle: { font: BODY_FONT, fontSize: 12, color: TEXT, lineHeight: 1.5 },
    info: {
      title: `${subject.name.vi} - ${chapterLabel}`,
      author: "QuizPKA",
      subject: "Tài liệu ôn tập miễn phí",
      creator: "QuizPKA",
    },
    // Ẩn header/footer ở trang bìa (trang 1).
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return { text: "", margin: [MARGIN_LEFT, 25, MARGIN_RIGHT, 0] }
      return {
        margin: [MARGIN_LEFT, 25, MARGIN_RIGHT, 0],
        columns: [
          {
            text: [{ text: "Tham khảo quiz ôn tập tại: " }, { text: "quizpka.online", bold: true }],
            color: TEXT,
            fontSize: 9,
          },
          { text: `Trang ${currentPage}/${pageCount}`, color: TEXT, fontSize: 9, alignment: "right" },
        ],
      }
    },
    footer: (currentPage: number) => {
      if (currentPage === 1) return { text: "", margin: [MARGIN_LEFT, 0, MARGIN_RIGHT, 25] }
      return {
        margin: [MARGIN_LEFT, 0, MARGIN_RIGHT, 25],
        columns: [
        {
          text: [{ text: "Tài liệu chỉ dùng để ôn tập, tham khảo, " }, { text: "KHÔNG NÊN ÔN TỦ!", bold: true }],
          color: TEXT,
          fontSize: 8,
        },
        {
          text: `Được tải bởi ${downloaderEmail || "người dùng"}`,
          color: TEXT,
          fontSize: 8,
          alignment: "right",
        },
        ],
        columnGap: 12,
      }
    },
    content: [
      makeCover(subject, chapterLabel, questions.length, tocGroups),
      { text: "PHẦN A - CÂU HỎI", style: "sectionTitle", pageBreak: "before", id: "partA" },
      ...questionContent,
      { text: "PHẦN B - ĐÁP ÁN & GIẢI THÍCH", style: "sectionTitle", pageBreak: "before", id: "partB" },
      { text: "BẢNG TRA NHANH", style: "tableLabel" },
      { table: { headerRows: 1, widths: ["auto", "auto", "auto", "auto", "auto", "auto"], body: answerRows }, layout: "answerKey" },
      { text: "", margin: [0, 4] },
      ...explanationContent,
    ],
    styles: {
      coverBrand: { fontSize: 15, bold: true, color: TEXT, lineHeight: 1.5 },
      coverTitle: { fontSize: 26, bold: true, color: TEXT, margin: [0, 18, 0, 8], lineHeight: 1.3 },
      coverSub: { fontSize: 13, color: TEXT, lineHeight: 1.5 },
      tocTitle: { fontSize: 15, bold: true, color: TEXT, lineHeight: 1.5 },
      tocEntry: { fontSize: 13, bold: true, lineHeight: 1.5 },
      tocNum: { fontSize: 13, bold: true, alignment: "center", lineHeight: 1.5 },
      tocSub: { fontSize: 12, lineHeight: 1.5 },
      tocSubNum: { fontSize: 12, alignment: "center", lineHeight: 1.5 },
      coverNoteTitle: { fontSize: 12, bold: true, italics: true, color: TEXT, alignment: "left", lineHeight: 1.5 },
      coverNoteBody: { fontSize: 11, color: TEXT, alignment: "justify", lineHeight: 1.5 },
      numberCircle: { fontSize: 12, bold: true, color: TEXT, alignment: "center", margin: [0, 1, 0, 0] },
      partTitle: { fontSize: 12, bold: true, color: TEXT, margin: [0, 10, 0, 6], lineHeight: 1.5 },
      sectionTitle: { fontSize: 15, bold: true, color: TEXT, margin: [0, 0, 0, 6], lineHeight: 1.5 },
      sectionNote: { fontSize: 11, color: MUTED, margin: [0, 0, 0, 12], lineHeight: 1.5 },
      tableLabel: { fontSize: 12, bold: true, color: TEXT, margin: [0, 0, 0, 5], lineHeight: 1.5 },
      prompt: { fontSize: 12, bold: true, color: TEXT, lineHeight: 1.5 },
      option: { fontSize: 12, color: "#1F2937", lineHeight: 1.5 },
      explanationPrompt: { fontSize: 12, italics: true, color: MUTED, margin: [0, 3, 0, 4], lineHeight: 1.5 },
      explanation: { fontSize: 12, color: "#1F2937", lineHeight: 1.5 },
    },
  }
}

function makeCover(subject: Subject, chapterLabel: string, count: number, tocGroups: CoverTocGroup[]): Content {
  // Tự nén mục lục khi có nhiều nhóm (vd TADV 6 part = 15 dòng) để toàn bộ
  // trang bìa luôn vừa đúng 1 trang A4, không tràn sang trang 2.
  const dense = tocGroups.length > 3
  const padV = dense ? 2 : 6
  const tocTitleSize = dense ? 13 : 15
  const tocEntrySize = dense ? 11 : 13
  const tocSubSize = dense ? 10 : 12
  const tocBody: TableCell[][] = [
    [{ text: "Mục lục", fontSize: tocTitleSize, bold: true, colSpan: 2, alignment: "center" }, {}],
    [
      { text: "PHẦN A - CÂU HỎI", fontSize: tocEntrySize, bold: true },
      { pageReference: "partA", fontSize: tocEntrySize, bold: true, alignment: "center" },
    ],
  ]
  for (const entry of tocGroups) {
    tocBody.push([
      { text: `  ${entry.group}`, fontSize: tocSubSize },
      { pageReference: entry.qRef, fontSize: tocSubSize, alignment: "center" },
    ])
  }
  tocBody.push([
    { text: "PHẦN B - ĐÁP ÁN & GIẢI THÍCH", fontSize: tocEntrySize, bold: true },
    { pageReference: "partB", fontSize: tocEntrySize, bold: true, alignment: "center" },
  ])
  for (const entry of tocGroups) {
    tocBody.push([
      { text: `  Đáp án ${entry.group}`, fontSize: tocSubSize },
      { pageReference: entry.aRef, fontSize: tocSubSize, alignment: "center" },
    ])
  }
  return {
    stack: [
      { text: "Quizpka", style: "coverBrand" },
      { text: subject.name.vi, style: "coverTitle", fontSize: dense ? 22 : 26 },
      { text: `${chapterLabel} • ${count} câu hỏi`, style: "coverSub" },
      {
        table: {
          widths: [330, 50],
          body: tocBody,
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => TEXT,
          vLineColor: () => TEXT,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => padV,
          paddingBottom: () => padV,
        },
        alignment: "center",
        margin: [0, dense ? 12 : 28, 0, 0],
      },
      { text: "Lưu ý quan trọng:", style: "coverNoteTitle", margin: [0, dense ? 8 : 20, 0, 4] },
      {
        text: [
                      { text: "Tất cả các bộ tài liệu quiz ôn tập đều là tài liệu được sưu tầm, gom nhặt từ các đợt thi của các năm trước, bao gồm cả các tài liệu từ nhiều nguồn khác trên internet. Các câu hỏi, dạng bài có thể được trường thay đổi theo từng năm. Chỉ nên dùng để ôn tập dạng bài, tham khảo, " },
          { text: "KHÔNG NÊN ÔN TỦ!", bold: true },
        ],
        style: "coverNoteBody",
      },
    ],
    alignment: "center",
    margin: [0, dense ? 12 : 24, 0, 0],
  }
}

function makeQuestionBlock(question: PdfQuestion, images: Map<string, string>, blockId?: string): Content {
  const body: Content[] = [
    {
      columns: [
        { text: String(question.index), style: "numberCircle", width: 24 },
        // pdfmake chỉ ghi nhận vị trí cho id gắn trên node text lá (id trên block
        // unbreakable/container khiến pageReference báo "Page reference id not found").
        { text: question.prompt, style: "prompt", width: "*", ...(blockId ? { id: blockId } : {}) },
      ],
      columnGap: 7,
    },
    { stack: question.options.map((option) => ({ text: `${option.key}.  ${option.text}`, style: "option", margin: [31, 2, 0, 0] })) },
  ]
  const image = question.imageUrl ? images.get(question.imageUrl) : undefined
  if (image) body.splice(1, 0, { image, fit: [380, 180], alignment: "center", margin: [0, 7, 0, 3] })
  return { stack: body, unbreakable: true, margin: [0, 0, 0, 9] }
}

function makeExplanationBlock(question: PdfQuestion, blockId?: string): Content {
  return {
    stack: [
      { columns: [{ text: `Câu ${question.index}`, bold: true, ...(blockId ? { id: blockId } : {}) }, { text: `Đáp án: ${question.answer}`, bold: true, alignment: "right" }] },
      { text: question.prompt, style: "explanationPrompt" },
      { text: question.explanation || "Không có giải thích chi tiết.", style: "explanation" },
    ],
    unbreakable: true,
    margin: [0, 0, 0, 9],
  }
}

function makeAnswerRows(questions: PdfQuestion[]) {
  const rows = Math.ceil(questions.length / 3)
  const body: Content[][] = [["Câu", "Đáp án", "Câu", "Đáp án", "Câu", "Đáp án"]]
  for (let row = 0; row < rows; row++) {
    const cells: Content[] = []
    for (let col = 0; col < 3; col++) {
      const question = questions[row + col * rows]
      cells.push(question ? { text: String(question.index).padStart(2, "0"), color: MUTED } : "")
      cells.push(question ? { text: question.answer, bold: true } : "")
    }
    body.push(cells)
  }
  return body
}

async function loadQuestionImages(questions: PdfQuestion[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  await Promise.all((questions.map((question) => question.imageUrl).filter(Boolean) as string[]).map(async (url) => {
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const blob = await response.blob()
      // pdfmake accepts PNG/JPEG data URLs. Skip unsupported or mislabeled assets
      // so one bad question image cannot abort the complete PDF export.
      if (!/^image\/(png|jpe?g)$/i.test(blob.type)) return
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      if (/^data:image\/(png|jpe?g);base64,/i.test(dataUrl)) result.set(url, dataUrl)
    } catch {
      // A missing illustration should not prevent the PDF from being generated.
    }
  }))
  return result
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export function pdfFilename(subject: Subject, chapterId: string): string {
  const safeChapter = chapterId.replace(/[^a-z0-9_-]/gi, "_")
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `QuizPKA_${subject.code}_${safeChapter}_${date}.pdf`
}
