import { describe, expect, it } from "vitest"
import { quizKeyAction } from "./quizKeyboard"

const base = { metaKey: false, ctrlKey: false, altKey: false, isComposing: false }

describe("quizKeyAction", () => {
  it("maps horizontal arrows to previous and next", () => {
    expect(quizKeyAction({ ...base, key: "ArrowLeft", code: "ArrowLeft" })).toEqual({ type: "previous" })
    expect(quizKeyAction({ ...base, key: "ArrowRight", code: "ArrowRight" })).toEqual({ type: "next" })
  })

  it("maps A–D to option indexes, including caps lock", () => {
    expect(quizKeyAction({ ...base, key: "a", code: "KeyA" })).toEqual({ type: "answer", optionIndex: 0 })
    expect(quizKeyAction({ ...base, key: "B", code: "KeyB" })).toEqual({ type: "answer", optionIndex: 1 })
    expect(quizKeyAction({ ...base, key: "c", code: "KeyC" })).toEqual({ type: "answer", optionIndex: 2 })
    expect(quizKeyAction({ ...base, key: "d", code: "KeyD" })).toEqual({ type: "answer", optionIndex: 3 })
  })

  it("ignores shortcuts, composition, and unrelated keys", () => {
    expect(quizKeyAction({ ...base, key: "a", code: "KeyA", ctrlKey: true })).toBeNull()
    expect(quizKeyAction({ ...base, key: "a", code: "KeyA", metaKey: true })).toBeNull()
    expect(quizKeyAction({ ...base, key: "a", code: "KeyA", altKey: true })).toBeNull()
    expect(quizKeyAction({ ...base, key: "a", code: "KeyA", isComposing: true })).toBeNull()
    expect(quizKeyAction({ ...base, key: "ArrowUp", code: "ArrowUp" })).toBeNull()
    expect(quizKeyAction({ ...base, key: "Enter", code: "Enter" })).toBeNull()
    expect(quizKeyAction({ ...base, key: "e", code: "KeyE" })).toBeNull()
  })
})
