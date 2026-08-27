import { describe, expect, it } from "vitest"
import { adaptToeicBank } from "@/features/quiz/lib/toeicHelpers"
import { parseToeicBank, ToeicDataError } from "@/features/quiz/lib/toeicSchema"

const setup = { questionOrder: "original", answerOrder: "original", mode: "practice", timed: false, durationMinutes: 0 } as const
const part1File = "/data/toeic-test/Test-01/Part1/test01-part1.json"

describe("TOEIC validation and adapter", () => {
  it("validates and maps a Part 1 question with media", () => {
    const bank = parseToeicBank([{ id: 1, prompt: "Look at the picture", audio: "q1.mp3", image: "q1.webp", options: { A: "A", B: "B" }, correct_answer: "B" }], part1File)
    const [question] = adaptToeicBank(bank, part1File, "toeic-test-01", setup)
    expect(question).toMatchObject({ correctIndex: 1, audioUrl: "/data/toeic-test/Test-01/Part1/q1.mp3", imageUrl: "/data/toeic-test/Test-01/Part1/q1.webp" })
  })

  it("creates one combined passage for a Part 7 multi-document group", () => {
    const file = "/data/toeic-test/Test-01/Part7/part7.json"
    const bank = parseToeicBank({ groups: [{ groupId: 2, passages: [{ title: "Email", content: "Hello" }, { title: "Notice", text: "Read me" }], questions: [{ id: 3, question: "Why?", options: { A: "Because" }, answer: "A" }] }] }, file)
    expect(adaptToeicBank(bank, file, "toeic-test-01", setup)[0].passage).toContain("Notice\nRead me")
  })

  it("returns contextual validation errors", () => {
    expect(() => parseToeicBank([{ id: 1, options: { A: "A" } }], part1File)).toThrow(ToeicDataError)
    expect(() => parseToeicBank([{ id: 1, options: { A: "A" } }], part1File)).toThrow("Part 1")
  })
})
