import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useQuizTimer } from "@/features/quiz/hooks/useQuizTimer"

const defaultProps = {
  isRunning: true,
  timed: true,
  durationMinutes: 2,
  onTimeout: () => {},
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

function tick(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

describe("useQuizTimer", () => {
  it("counts down from the configured duration when timed", () => {
    const { result } = renderHook(() => useQuizTimer(defaultProps))

    expect(result.current.secondsLeft).toBe(120)
    expect(result.current.elapsedSeconds).toBe(0)

    tick(3)

    expect(result.current.secondsLeft).toBe(117)
    expect(result.current.elapsedSeconds).toBe(3)
  })

  it("does not go below zero while the session keeps running", () => {
    const { result } = renderHook(() => useQuizTimer(defaultProps))

    tick(125)

    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.elapsedSeconds).toBe(125)
  })

  it("fires onTimeout exactly once when the countdown reaches zero", () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useQuizTimer({ ...defaultProps, durationMinutes: 1, onTimeout }))

    tick(60)

    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(result.current.secondsLeft).toBe(0)

    tick(5)

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it("never fires onTimeout in untimed mode but still measures elapsed time", () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useQuizTimer({ ...defaultProps, timed: false, onTimeout }))

    tick(10)

    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.elapsedSeconds).toBe(10)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it("does not tick while paused", () => {
    const { result, rerender } = renderHook((props) => useQuizTimer(props), { initialProps: defaultProps })

    tick(2)
    rerender({ ...defaultProps, isRunning: false })
    tick(5)

    expect(result.current.secondsLeft).toBe(118)
    expect(result.current.elapsedSeconds).toBe(2)
  })

  it("reset() restores the full duration and clears elapsed time", () => {
    const { result } = renderHook(() => useQuizTimer(defaultProps))

    tick(7)

    act(() => {
      result.current.reset()
    })

    expect(result.current.secondsLeft).toBe(120)
    expect(result.current.elapsedSeconds).toBe(0)
  })

  it("applies a new duration mid-session by resetting", () => {
    const { result, rerender } = renderHook((props) => useQuizTimer(props), { initialProps: defaultProps })

    tick(5)
    rerender({ ...defaultProps, durationMinutes: 5 })

    expect(result.current.secondsLeft).toBe(300)
    expect(result.current.elapsedSeconds).toBe(0)
  })

  it("re-arms the timeout guard after a reset so a fresh session can time out again", () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useQuizTimer({ ...defaultProps, durationMinutes: 1, onTimeout }))

    tick(60)
    expect(onTimeout).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.reset()
    })
    tick(60)

    expect(onTimeout).toHaveBeenCalledTimes(2)
  })
})
