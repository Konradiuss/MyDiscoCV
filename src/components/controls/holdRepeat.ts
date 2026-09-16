export interface HoldRepeatOptions {
  readonly delay: number
  readonly interval: number
  readonly onStep: () => void
}

export interface HoldRepeat {
  press(): void
  release(): void
}

export function createHoldRepeat(options: HoldRepeatOptions): HoldRepeat {
  let waiting: ReturnType<typeof setTimeout> | null = null
  let repeating: ReturnType<typeof setInterval> | null = null

  function release() {
    if (waiting !== null) {
      clearTimeout(waiting)
      waiting = null
    }

    if (repeating !== null) {
      clearInterval(repeating)
      repeating = null
    }
  }

  return {
    press() {
      release()
      options.onStep()

      waiting = setTimeout(() => {
        waiting = null
        repeating = setInterval(options.onStep, options.interval)
      }, options.delay)
    },

    release,
  }
}
