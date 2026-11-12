/** Keyboard controls for an in-progress quiz. Left/right move between questions; A–D pick an option. */
export type QuizKeyAction =
  | { type: "previous" }
  | { type: "next" }
  | { type: "answer"; optionIndex: number }

type QuizKeyEvent = {
  key: string
  code: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  isComposing?: boolean
}

const answerIndexByCode: Record<string, number> = {
  KeyA: 0,
  KeyB: 1,
  KeyC: 2,
  KeyD: 3,
}

export function quizKeyAction(event: QuizKeyEvent): QuizKeyAction | null {
  if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key === "ArrowLeft") return { type: "previous" }
  if (event.key === "ArrowRight") return { type: "next" }
  const optionIndex = answerIndexByCode[event.code]
  if (optionIndex === undefined || !/^[a-d]$/i.test(event.key)) return null
  return { type: "answer", optionIndex }
}
