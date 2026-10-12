import { createElement, useState } from "react"
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QuizQuestionBlock } from "@/features/quiz/ui/QuizQuestionBlock"
import { quizCopy } from "@/shared/i18n"
import type { Question } from "@/features/quiz/model/quiz.types"

function questionWithImage(id: string, imageUrl?: string): Question {
  return {
    id,
    prompt: `${id} prompt`,
    options: ["A", "B"],
    correctIndex: 0,
    ...(imageUrl ? { imageUrl } : {}),
  }
}

function renderBlock(props: Partial<Parameters<typeof QuizQuestionBlock>[0]> = {}) {
  return render(
    createElement(QuizQuestionBlock, {
      question: questionWithImage("q1", "/data/img/1.png"),
      questionNumber: 1,
      selected: undefined,
      isPractice: true,
      t: quizCopy.vi,
      onAnswer: vi.fn(),
      ...props,
    }),
  )
}

afterEach(cleanup)

describe("QuizQuestionBlock images", () => {
  it("renders the question's own image inside its block", () => {
    const { container } = renderBlock()
    const image = container.querySelector('img[src="/data/img/1.png"]')
    expect(image).not.toBeNull()
  })

  it("hides the image when showImage is false", () => {
    renderBlock({ showImage: false })
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("renders nothing image-related without an imageUrl", () => {
    renderBlock({ question: questionWithImage("q1") })
    expect(screen.queryByRole("img")).toBeNull()
  })
})

function detailQuestion(id: string): Question {
  return {
    id,
    prompt: `${id} prompt`,
    options: ["A", "B"],
    correctIndex: 0,
    explanation: `${id} explanation`,
    detailedExplanation: `Chiến lược:\n1. step for ${id}`,
  }
}

function AccordionHarness() {
  const [openId, setOpenId] = useState<string | null>(null)
  return createElement(
    "div",
    null,
    ["q1", "q2"].map((id, index) =>
      createElement(QuizQuestionBlock, {
        key: id,
        question: detailQuestion(id),
        questionNumber: index + 1,
        selected: 0,
        isPractice: true,
        t: quizCopy.vi,
        onAnswer: vi.fn(),
        detailOpen: openId === id,
        onToggleDetail: () => setOpenId((prev) => (prev === id ? null : id)),
      }),
    ),
  )
}

describe("QuizQuestionBlock detail accordion", () => {
  it("opens one question at a time and closes the previous one", () => {
    render(createElement(AccordionHarness))
    const toggles = screen.getAllByText(quizCopy.vi.detailedExplanation)
    expect(toggles).toHaveLength(2)

    fireEvent.click(toggles[0])
    expect(screen.queryByText(/step for q1/)).not.toBeNull()
    expect(screen.queryByText(/step for q2/)).toBeNull()

    fireEvent.click(toggles[1])
    expect(screen.queryByText(/step for q1/)).toBeNull()
    expect(screen.queryByText(/step for q2/)).not.toBeNull()

    // Clicking the open one again collapses it.
    fireEvent.click(toggles[1])
    expect(screen.queryByText(/step for q2/)).toBeNull()
  })

  it("manages its own open state when uncontrolled (single-question screens)", () => {
    renderBlock({ question: detailQuestion("q1"), selected: 0 })
    const toggle = screen.getByText(quizCopy.vi.detailedExplanation)

    fireEvent.click(toggle)
    expect(screen.queryByText(/step for q1/)).not.toBeNull()

    fireEvent.click(toggle)
    expect(screen.queryByText(/step for q1/)).toBeNull()
  })
})

describe("QuizQuestionBlock copy guard", () => {  it("marks question content unselectable", () => {
    const { container } = renderBlock({ question: detailQuestion("q1"), selected: 0 })
    expect(container.querySelector("section")?.className).toContain("select-none")
  })

  it("blocks copy/cut/drag from question text", () => {
    renderBlock({ question: detailQuestion("q1"), selected: 0 })
    const prompt = screen.getByText("q1 prompt")

    const copyEvent = createEvent.copy(prompt)
    fireEvent(prompt, copyEvent)
    expect(copyEvent.defaultPrevented).toBe(true)

    const cutEvent = createEvent.cut(prompt)
    fireEvent(prompt, cutEvent)
    expect(cutEvent.defaultPrevented).toBe(true)

    const dragEvent = createEvent.dragStart(prompt)
    fireEvent(prompt, dragEvent)
    expect(dragEvent.defaultPrevented).toBe(true)
  })

  it("keeps the text-answer input selectable and copyable", () => {
    const textQuestion: Question = { id: "t1", prompt: "Type here", options: [], acceptedAnswers: ["x"] }
    const { container } = renderBlock({ question: textQuestion, selected: "abc" })
    const input = container.querySelector("input")
    expect(input?.className).toContain("select-text")

    const inputCopy = createEvent.copy(input!)
    fireEvent(input!, inputCopy)
    expect(inputCopy.defaultPrevented).toBe(false)
  })
})

describe("QuizQuestionBlock option cap", () => {
  it("renders at most 4 options (hides E) with A–D labels", () => {
    const five: Question = { id: "e1", prompt: "Pick", options: ["a", "b", "c", "d", "e"], correctIndex: 2 }
    renderBlock({ question: five, selected: undefined })
    // Unanswered: only the 4 option buttons exist, option E text is gone.
    expect(screen.getAllByRole("button")).toHaveLength(4)
    expect(screen.queryByText("e")).toBeNull()
    expect(screen.getByText("d")).not.toBeNull()
  })

  it("still marks the correct answer within A–D", () => {
    const onAnswer = vi.fn()
    const five: Question = { id: "e1", prompt: "Pick", options: ["a", "b", "c", "d", "e"], correctIndex: 2 }
    render(
      createElement(QuizQuestionBlock, {
        question: five,
        questionNumber: 1,
        selected: 2,
        isPractice: true,
        t: quizCopy.vi,
        onAnswer,
      }),
    )
    expect(screen.getByText("c")).not.toBeNull()
  })
})
