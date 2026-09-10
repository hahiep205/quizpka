import { describe, expect, it } from "vitest"
import { resolveExamForChapter } from "@/lib/useChapterPractice"
import { getSubjectById, type ExamCatalogItem } from "@/data/subjects"

const docsExam = {
  id: "discrete-math-final-docs-1",
  subjectId: "toan-roi-rac",
  questionCount: 0,
} as ExamCatalogItem

describe("resolveExamForChapter", () => {
  it("switches a docs exam to the quiz exam when a quiz chapter is picked", () => {
    const subject = getSubjectById("toan-roi-rac")!
    const chapter = subject.chapters!.find((c) => c.id === "c1")!
    expect(resolveExamForChapter(subject, docsExam, chapter).id).toBe("discrete-math-quiz-bank-1")
  })

  it("switches a quiz exam to the docs exam when an image chapter is picked", () => {
    const subject = getSubjectById("toan-roi-rac")!
    const quizExam = { ...docsExam, id: "discrete-math-quiz-bank-1", questionCount: 30 }
    const chapter = subject.chapters!.find((c) => c.id === "de1")!
    expect(resolveExamForChapter(subject, quizExam, chapter).id).toBe("discrete-math-final-docs-1")
  })

  it("keeps the current exam when chapter kind already matches", () => {
    const subject = getSubjectById("toan-roi-rac")!
    const de1 = subject.chapters!.find((c) => c.id === "de1")!
    expect(resolveExamForChapter(subject, docsExam, de1).id).toBe(docsExam.id)
  })

  it("keeps single-exam subjects untouched", () => {
    const subject = getSubjectById("marketing-can-ban")!
    const exam = { id: "marketing-final-bank-1", subjectId: subject.id, questionCount: 478 } as ExamCatalogItem
    const chapter = subject.chapters!.find((c) => c.id === "c1")!
    expect(resolveExamForChapter(subject, exam, chapter).id).toBe(exam.id)
  })
})
