import { createElement } from "react"
import { cleanup, render, screen } from "@testing-library/react"
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
