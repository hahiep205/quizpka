export function getDevToolsScore(thresholdPx = 160): number {
  let score = 0
  const widthDiff = window.outerWidth - window.innerWidth
  const heightDiff = window.outerHeight - window.innerHeight
  if (widthDiff > thresholdPx || heightDiff > thresholdPx) score += 2

  // debugger timing - lightweight, only when called
  try {
    const start = performance.now()
    // eslint-disable-next-line no-debugger
    debugger
    const end = performance.now()
    if (end - start > 100) score += 3
  } catch {}

  return score
}
