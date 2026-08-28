import { describe, expect, it } from "vitest"
import {
  applyCorrect,
  applyWrong,
  buildHardQueue,
  isHardSupported,
  requeueWrong,
} from "@/features/quiz/lib/quizHard"
import type { Question } from "@/features/quiz/model/quiz.types"

const makeQuestion = (id: string): Question => ({
  id,
  prompt: `Question ${id}`,
  options: ["A", "B"],
  correctIndex: 0,
})

const ids = (queue: Question[]) => queue.map((q) => q.id)

describe("quizHard", () => {
  it("builds the initial queue in order or shuffled", () => {
    const qs = ["a", "b", "c"].map(makeQuestion)
    expect(ids(buildHardQueue(qs, false))).toEqual(["a", "b", "c"])
    const shuffled = buildHardQueue(qs, true)
    expect(shuffled).toHaveLength(3)
    expect(new Set(shuffled.map((q) => q.id))).toEqual(new Set(["a", "b", "c"]))
  })

  it("is not supported for TADV and TOEIC", () => {
    expect(isHardSupported("tu-tuong-ho-chi-minh")).toBe(true)
    expect(isHardSupported("tieng-anh-dau-vao")).toBe(false)
    expect(isHardSupported("toeic")).toBe(false)
  })

  it("requeues a wrong question strictly after the current position", () => {
    const queue = ["a", "b", "c", "d"].map(makeQuestion)
    const next = requeueWrong(queue, 1) // 'b' answered wrong at index 1
    expect(next).toHaveLength(4)
    // 'b' must not be the immediately-following question; it appears later
    expect(next[1].id).toBe("c")
    expect(next.some((q) => q.id === "b")).toBe(true)
    const bIndex = next.findIndex((q) => q.id === "b")
    expect(bIndex).toBeGreaterThanOrEqual(2)
  })

  it("requeues the last question wrapped to a random earlier position", () => {
    const queue = ["a", "b", "c"].map(makeQuestion)
    const next = requeueWrong(queue, 2) // 'c' answered wrong at the end
    expect(next).toHaveLength(3)
    expect(next.some((q) => q.id === "c")).toBe(true)
  })

  it("keeps a single remaining question in place until correct", () => {
    const queue = ["a"].map(makeQuestion)
    expect(ids(requeueWrong(queue, 0))).toEqual(["a"])
  })

  it("removes a mastered question and keeps the pointer valid", () => {
    const queue = ["a", "b", "c", "d"].map(makeQuestion)
    const { queue: next, pos, done } = applyCorrect(queue, 2) // master 'c'
    expect(ids(next)).toEqual(["a", "b", "d"])
    expect(pos).toBe(2)
    expect(done).toBe(false)
  })

  it("removing the last question clamps the pointer to the new tail", () => {
    const queue = ["a", "b", "c"].map(makeQuestion)
    const { queue: next, pos, done } = applyCorrect(queue, 2) // master 'c'
    expect(ids(next)).toEqual(["a", "b"])
    expect(pos).toBe(1)
    expect(done).toBe(false)
  })

  it("finishes when the queue becomes empty", () => {
    const queue = ["a"].map(makeQuestion)
    const { queue: next, done } = applyCorrect(queue, 0)
    expect(next).toHaveLength(0)
    expect(done).toBe(true)
  })

  it("advances to the next question after a wrong answer", () => {
    const queue = ["a", "b", "c"].map(makeQuestion)
    const { queue: next, pos } = applyWrong(queue, 0) // 'a' wrong
    expect(next).toHaveLength(3)
    expect(pos).toBe(0)
    expect(next[0].id).toBe("b")
  })
})
