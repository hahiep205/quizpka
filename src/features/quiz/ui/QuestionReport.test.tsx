import { createElement } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QuestionReport } from "@/features/quiz/ui/QuestionReport"
import { quizCopy } from "@/shared/i18n"
import type { Question } from "@/features/quiz/model/quiz.types"

const rpcMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: rpcMock } }))

const question: Question = {
  id: "q1",
  prompt: "What time is it?",
  options: ["1:00", "2:00"],
  correctIndex: 1,
}

function renderReport(props: Partial<Parameters<typeof QuestionReport>[0]> = {}) {
  return render(
    createElement(QuestionReport, {
      question,
      questionNumber: 7,
      examTitle: "Sample Exam",
      subjectName: "English",
      signedIn: true,
      t: quizCopy.vi,
      ...props,
    }),
  )
}

afterEach(() => {
  cleanup()
  rpcMock.mockReset()
})

describe("QuestionReport", () => {
  it("opens the modal with 3 error options and disabled confirm", () => {
    renderReport()
    fireEvent.click(screen.getByRole("button", { name: "Báo lỗi câu hỏi 7" }))
    expect(screen.getByRole("heading", { name: "Báo lỗi câu hỏi" })).not.toBeNull()
    expect(screen.getByText("Lỗi đề bài")).not.toBeNull()
    expect(screen.getByText("Lỗi đáp án")).not.toBeNull()
    expect(screen.getByText("Lỗi cả câu hỏi")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Xác nhận báo lỗi" }).hasAttribute("disabled")).toBe(true)
  })

  it("submits the chosen option with question details", async () => {
    rpcMock.mockResolvedValue({ error: null })
    renderReport()
    fireEvent.click(screen.getByRole("button", { name: "Báo lỗi câu hỏi 7" }))
    fireEvent.click(screen.getByText("Lỗi đáp án"))
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận báo lỗi" }))

    expect(rpcMock).toHaveBeenCalledTimes(1)
    const [fn, args] = rpcMock.mock.calls[0] as [string, Record<string, string>]
    expect(fn).toBe("submit_support_report")
    expect(args.p_type).toBe("report")
    expect(args.p_subject).toContain("Câu 7")
    expect(args.p_subject).toContain("Lỗi đáp án")
    expect(args.p_subject.length).toBeLessThanOrEqual(160)
    expect(args.p_description).toContain("Lỗi đáp án")
    expect(args.p_description).toContain("What time is it?")
    expect(args.p_description).toContain("B. 2:00")
    expect(args.p_description.length).toBeLessThanOrEqual(4000)

    expect(await screen.findByText("Đã gửi báo lỗi. Cảm ơn bạn!")).not.toBeNull()
  })

  it("shows a login notice for guests and never submits", () => {
    renderReport({ signedIn: false })
    fireEvent.click(screen.getByRole("button", { name: "Báo lỗi câu hỏi 7" }))
    expect(screen.getByText("Bạn cần đăng nhập để báo lỗi câu hỏi.")).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Xác nhận báo lỗi" })).toBeNull()
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it("surfaces submit failures", async () => {
    rpcMock.mockResolvedValue({ error: new Error("Active account required") })
    renderReport()
    fireEvent.click(screen.getByRole("button", { name: "Báo lỗi câu hỏi 7" }))
    fireEvent.click(screen.getByText("Lỗi đề bài"))
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận báo lỗi" }))
    expect(await screen.findByText("Không thể gửi báo lỗi: Active account required")).not.toBeNull()
  })
})
