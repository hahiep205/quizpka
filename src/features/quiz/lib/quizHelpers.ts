import type { Question, BankQuestion, BankFile, AnswerValue } from "@/features/quiz/model/quiz.types"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import type { ExamPaper } from "@/data/subjects"

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const

export function shuffle<T>(items: T[]) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

export function mapBankItems(
  items: BankQuestion[],
  examId: string,
  setup: QuizSetupValues,
  context: Omit<Question, "id" | "prompt" | "options" | "correctIndex" | "acceptedAnswers" | "explanation"> = {}
): Question[] {
  return items.map((item, index) => {
    const orderedKeys = OPTION_KEYS.filter((key) => item.options?.[key] != null)
    const pairs = orderedKeys.map((key) => ({ key, text: item.options?.[key] ?? "", isCorrect: key === item.answer }))
    const finalPairs = setup.answerOrder === "random" ? shuffle(pairs) : pairs
    const acceptedAnswers = item.answer.split("/").map((answer) => answer.trim().toLowerCase())
    return {
      id: `${examId}-${context.section ?? "bank"}-${context.partTitle ?? "questions"}-${item.id ?? index + 1}`,
      prompt: item.question,
      options: finalPairs.map((pair) => pair.text),
      correctIndex: pairs.length ? Math.max(0, finalPairs.findIndex((pair) => pair.isCorrect)) : undefined,
      acceptedAnswers: pairs.length ? undefined : acceptedAnswers,
      explanation: item.explainAnswer,
      audioTimestamp: item.audioTimestamp,
      imageUrl: item.image ? `/data/${item.image}` : undefined,
      ...context,
    }
  })
}

export function mapBankQuestions(bank: BankFile, examId: string, setup: QuizSetupValues): Question[] {
  if (bank.parts?.length) {
    const partGroups = bank.parts.map((part) =>
      mapBankItems(part.questions, examId, setup, {
        partTitle: part.partTitle,
        section: part.section,
        instruction: part.instruction,
        passage: part.passage,
        referenceNotices: part.referenceNotices,
        audioUrl: part.audioUrl ? `/data/${part.audioUrl}` : undefined,
        imageUrl: part.imageUrl ? `/data/${part.imageUrl}` : undefined,
      })
    )
    const flat = (setup.questionOrder === "random" ? shuffle(partGroups) : partGroups).flat()
    if (setup.mode === "exam") {
      const limit = setup.questionLimit ?? 60
      return flat.slice(0, Math.min(limit, flat.length))
    }
    return flat
  }
  const mapped = mapBankItems(bank.questions ?? [], examId, setup)
  if (setup.mode === "exam") {
    const limit = setup.questionLimit ?? 60
    return shuffle(mapped).slice(0, Math.min(limit, mapped.length))
  }
  return setup.questionOrder === "random" ? shuffle(mapped) : mapped
}

export function isAnswerCorrect(question: Question, answer: AnswerValue | undefined) {
  if (answer === undefined) return false
  if (typeof answer === "number") return answer === question.correctIndex
  const normalized = answer.trim().replace(/\s+/g, " ").toLowerCase()
  return question.acceptedAnswers?.some((accepted) => normalized === accepted.replace(/\s+/g, " ")) ?? false
}

export function buildFallbackQuestions(exam: ExamPaper, setup: QuizSetupValues): Question[] {
  const mapped = Array.from({ length: exam.questionCount }, (_, index) => {
    const n = index + 1
    const pairs = [
      { text: `A. Option for question ${n}`, isCorrect: index % 4 === 0 },
      { text: `B. Option for question ${n}`, isCorrect: index % 4 === 1 },
      { text: `C. Option for question ${n}`, isCorrect: index % 4 === 2 },
      { text: `D. Option for question ${n}`, isCorrect: index % 4 === 3 },
    ]
    const finalPairs = setup.answerOrder === "random" ? shuffle(pairs) : pairs
    return {
      id: `${exam.id}-q${n}`,
      prompt: `Sample question ${n}`,
      options: finalPairs.map((pair) => pair.text),
      correctIndex: Math.max(0, finalPairs.findIndex((pair) => pair.isCorrect)),
      explanation: `Explanation for sample question ${n}.`,
    }
  })
  if (setup.mode === "exam") {
    const limit = setup.questionLimit ?? (exam.type === "midterm" ? 40 : 60)
    return shuffle(mapped).slice(0, Math.min(limit, mapped.length))
  }
  return setup.questionOrder === "random" ? shuffle(mapped) : mapped
}

export function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
