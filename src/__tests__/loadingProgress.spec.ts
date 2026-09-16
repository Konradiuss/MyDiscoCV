import { describe, expect, it } from 'vitest'

import { DEFAULT_LOADING_PROGRESS_OPTIONS, createLoadingProgress } from '../loading/loadingProgress'

function advance(
  progress: ReturnType<typeof createLoadingProgress>,
  from: number,
  duration: number,
) {
  let now = from
  let state = progress.update(now)

  for (let elapsed = 0; elapsed < duration; elapsed += 16) {
    now = from + elapsed
    state = progress.update(now)
  }

  return { state: progress.update(from + duration), lastFrame: state }
}

describe('loading progress', () => {
  it('eases toward a milestone without overshooting it', () => {
    const progress = createLoadingProgress(0)
    progress.setTarget(0.35, 0)

    const { state } = advance(progress, 0, 400)

    expect(state.displayed).toBeGreaterThan(0.2)
    expect(state.displayed).toBeLessThanOrEqual(0.35 + DEFAULT_LOADING_PROGRESS_OPTIONS.creepLimit)
  })

  it('never moves backwards when a lower target arrives', () => {
    const progress = createLoadingProgress(0)
    progress.setTarget(0.6, 0)
    const ahead = advance(progress, 0, 600).state.displayed

    progress.setTarget(0.1, 600)
    const after = advance(progress, 600, 200).state.displayed

    expect(after).toBeGreaterThanOrEqual(ahead)
  })

  it('keeps creeping while a milestone is outstanding', () => {
    const progress = createLoadingProgress(0)
    progress.setTarget(0.35, 0)

    const early = advance(progress, 0, 500).state.displayed
    const later = advance(progress, 500, 3000).state.displayed

    expect(later).toBeGreaterThan(early)
    expect(later).toBeLessThan(0.35 + DEFAULT_LOADING_PROGRESS_OPTIONS.creepLimit + 1e-6)
  })

  it('withholds 100 percent until the scene reports a frame', () => {
    const progress = createLoadingProgress(0)
    progress.setTarget(1, 0)

    const waiting = advance(progress, 0, 5000).state
    expect(waiting.percent).toBe(99)
    expect(waiting.done).toBe(false)

    progress.signalReady(5000)
    const ready = advance(progress, 5000, 1500).state

    expect(ready.percent).toBe(100)
    expect(ready.done).toBe(true)
  })

  it('holds the screen for the minimum time on an instant load', () => {
    const progress = createLoadingProgress(0)
    progress.setTarget(1, 0)
    progress.signalReady(20)

    const early = advance(progress, 0, 400).state
    expect(early.done).toBe(false)
    expect(early.percent).toBeGreaterThan(90)

    const late = advance(progress, 400, 500).state
    expect(late.percent).toBe(100)
    expect(late.done).toBe(true)
  })

  it('reaches 100 well inside the minimum, so the hold is what gates the exit', () => {
    const { minimumVisibleMs } = DEFAULT_LOADING_PROGRESS_OPTIONS
    const progress = createLoadingProgress(0)
    progress.setTarget(1, 0)
    progress.signalReady(0)

    expect(advance(progress, 0, minimumVisibleMs - 100).state.percent).toBe(100)
  })

  it('releases the screen when loading never finishes', () => {
    const { timeoutMs, minimumVisibleMs } = DEFAULT_LOADING_PROGRESS_OPTIONS
    const progress = createLoadingProgress(0)
    progress.setTarget(0.35, 0)

    const stuck = advance(progress, 0, timeoutMs - 1000).state
    expect(stuck.done).toBe(false)
    expect(stuck.timedOut).toBe(false)

    const expired = advance(progress, timeoutMs - 1000, 2000).state
    expect(expired.timedOut).toBe(true)
    expect(expired.done).toBe(true)
    expect(expired.percent).toBe(100)
    expect(timeoutMs).toBeGreaterThan(minimumVisibleMs)
  })

  it('does not let a long gap between frames jump the value', () => {
    const backgrounded = createLoadingProgress(0)
    backgrounded.setTarget(1, 0)
    backgrounded.signalReady(0)
    backgrounded.update(0)
    const afterJump = backgrounded.update(60000).displayed

    const stepped = createLoadingProgress(0)
    stepped.setTarget(1, 0)
    stepped.signalReady(0)
    const afterStep = advance(stepped, 0, 100).state.displayed

    expect(afterJump).toBeLessThan(afterStep + 1e-9)
  })

  it('ignores values that are not usable numbers', () => {
    const progress = createLoadingProgress(0)
    progress.setTarget(Number.NaN, 0)
    progress.setTarget(-5, 0)

    expect(advance(progress, 0, 300).state.displayed).toBeLessThanOrEqual(
      DEFAULT_LOADING_PROGRESS_OPTIONS.creepLimit,
    )

    progress.setTarget(42, 0)
    expect(advance(progress, 0, 5000).state.percent).toBe(99)
  })
})
