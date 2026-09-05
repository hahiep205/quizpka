import { describe, expect, it, vi } from "vitest"
import { createQuizSession, submitQuizSession } from "@/features/quiz/api/quizSessionApi"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke },
  },
}))

describe("quiz session API", () => {
  it("sends the exam and idempotency key to the server", async () => {
    invoke.mockResolvedValueOnce({ data: { sessionId: "s1" }, error: null } as never)
    await createQuizSession("data-science-ai-final-1", "idempotency-key-123456")
    expect(invoke).toHaveBeenCalledWith("create-quiz-session", { body: { examId: "data-science-ai-final-1", idempotencyKey: "idempotency-key-123456" } })
  })

  it("submits only session answers and idempotency data", async () => {
    invoke.mockResolvedValueOnce({ data: { score: 10 }, error: null } as never)
    await submitQuizSession("s1", { "1": 0 }, "idempotency-key-123456")
    expect(invoke).toHaveBeenCalledWith("submit-quiz-session", { body: { sessionId: "s1", answers: { "1": 0 }, idempotencyKey: "idempotency-key-123456" } })
  })
})
