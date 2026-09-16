import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHoldRepeat } from '../components/controls/holdRepeat'

describe('a button that repeats while it is held', () => {
  const delay = 400
  const interval = 50

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function press() {
    const onStep = vi.fn<() => void>()
    const control = createHoldRepeat({ delay, interval, onStep })

    control.press()

    return { control, onStep }
  }

  it('takes one step the moment it is pressed', () => {
    const { onStep } = press()

    expect(onStep).toHaveBeenCalledTimes(1)
  })

  it('takes no more until it has been held for the whole delay', () => {
    const { onStep } = press()

    vi.advanceTimersByTime(delay - 1)

    expect(onStep).toHaveBeenCalledTimes(1)
  })

  it('then repeats at a steady rate', () => {
    const { onStep } = press()

    vi.advanceTimersByTime(delay + interval * 4)

    expect(onStep).toHaveBeenCalledTimes(5)
  })

  it('stops when it is let go', () => {
    const { control, onStep } = press()

    vi.advanceTimersByTime(delay + interval * 2)
    const taken = onStep.mock.calls.length
    control.release()
    vi.advanceTimersByTime(interval * 10)

    expect(onStep).toHaveBeenCalledTimes(taken)
  })

  it('leaves exactly one step behind after a tap', () => {
    const { control, onStep } = press()

    control.release()
    vi.advanceTimersByTime(delay + interval * 10)

    expect(onStep).toHaveBeenCalledTimes(1)
  })

  it('does not stack up when pressed again without a release', () => {
    const onStep = vi.fn<() => void>()
    const control = createHoldRepeat({ delay, interval, onStep })

    control.press()
    vi.advanceTimersByTime(delay + interval * 2)
    control.press()
    onStep.mockClear()
    vi.advanceTimersByTime(delay + interval * 4)

    expect(onStep).toHaveBeenCalledTimes(4)
  })

  it('is safe to release when nothing is held', () => {
    const onStep = vi.fn<() => void>()
    const control = createHoldRepeat({ delay, interval, onStep })

    expect(() => control.release()).not.toThrow()
    expect(onStep).not.toHaveBeenCalled()
  })
})
