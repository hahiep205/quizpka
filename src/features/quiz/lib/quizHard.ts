import type { Question } from "@/features/quiz/model/quiz.types"
import { shuffle } from "@/features/quiz/lib/quizHelpers"

/**
 * Practice Hard queue helpers.
 *
 * The session runs through a mutable queue of not-yet-mastered questions.
 * - Correct answer -> the question leaves the queue permanently.
 * - Wrong answer   -> the question is re-inserted at a random position later
 *   in the queue, so the user meets it again until they get it right.
 * - The session finishes when the queue is empty (all questions mastered).
 */

/** Subjects that do NOT support the Practice Hard mode (TADV + TOEIC). */
const HARD_UNSUPPORTED_SUBJECT_IDS = new Set(["tieng-anh-dau-vao", "toeic"])

export function isHardSupported(subjectId: string): boolean {
  return !HARD_UNSUPPORTED_SUBJECT_IDS.has(subjectId)
}

/** Build the initial queue. When `randomize` is true the order is shuffled. */
export function buildHardQueue(questions: Question[], randomize = false): Question[] {
  return randomize ? shuffle(questions) : [...questions]
}

/**
 * Re-queue a wrongly answered question at a random future position.
 * - If `pos` is not the last index, the question is re-inserted somewhere
 *   strictly after the next question (cyclic wrap only when it was last).
 * - When the queue has a single element the same question stays in place
 *   and must be answered correctly to finish.
 */
export function requeueWrong(queue: Question[], pos: number): Question[] {
  const next = [...queue]
  const [wrong] = next.splice(pos, 1)
  if (!wrong) return next
  const len = next.length
  let insertAt: number
  if (pos < len) {
    insertAt = pos + 1 + Math.floor(Math.random() * (len - pos))
  } else if (len > 0) {
    insertAt = Math.floor(Math.random() * len)
  } else {
    insertAt = 0
  }
  next.splice(insertAt, 0, wrong)
  return next
}

/** Apply a correct answer: the mastered question leaves the queue. */
export function applyCorrect(
  queue: Question[],
  pos: number
): { queue: Question[]; pos: number; done: boolean } {
  const next = [...queue]
  next.splice(pos, 1)
  if (next.length === 0) return { queue: next, pos: 0, done: true }
  return { queue: next, pos: Math.min(pos, next.length - 1), done: false }
}

/** Apply a wrong answer: re-queue the question later and advance the pointer. */
export function applyWrong(
  queue: Question[],
  pos: number
): { queue: Question[]; pos: number } {
  const next = requeueWrong(queue, pos)
  const wrappedPos = pos === queue.length - 1 ? 0 : pos
  return { queue: next, pos: wrappedPos }
}
