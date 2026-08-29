/** Estimated TOEIC scoring helpers (5–495 per section). */

/** Converts a section's correct count into an estimated 5–495 scaled score. */
export function sectionScore(correct: number, total: number): number {
  if (total <= 0) return 5
  const ratio = Math.min(1, Math.max(0, correct / total))
  return Math.round(5 + 490 * ratio)
}

export type ToeicSectionScores = {
  listening: number
  reading: number
  total: number
}

/**
 * Estimated overall TOEIC score (10–990) from both sections.
 * The scale is a linear approximation, not the official ETS conversion table.
 */
export function getSectionScores(
  listeningCorrect: number,
  listeningTotal: number,
  readingCorrect: number,
  readingTotal: number
): ToeicSectionScores {
  const listening = sectionScore(listeningCorrect, listeningTotal)
  const reading = sectionScore(readingCorrect, readingTotal)
  return { listening, reading, total: listening + reading }
}
