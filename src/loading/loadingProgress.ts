export interface LoadingProgressOptions {
  readonly cap: number
  readonly smoothing: number
  readonly readySmoothing: number
  readonly creepLimit: number
  readonly creepRate: number
  readonly minimumVisibleMs: number
  readonly timeoutMs: number
}

export interface LoadingProgressState {
  readonly displayed: number
  readonly percent: number
  readonly done: boolean
  readonly timedOut: boolean
}

export const DEFAULT_LOADING_PROGRESS_OPTIONS: LoadingProgressOptions = {
  cap: 0.99,
  smoothing: 4.5,
  readySmoothing: 9,
  creepLimit: 0.04,
  creepRate: 0.5,
  minimumVisibleMs: 800,
  timeoutMs: 12000,
}

const MAX_STEP_SECONDS = 0.1
const ARRIVAL_EPSILON = 0.005

export interface LoadingProgress {
  setTarget(value: number, now: number): void
  signalReady(now: number): void
  update(now: number): LoadingProgressState
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function createLoadingProgress(
  startedAt: number,
  options: Partial<LoadingProgressOptions> = {},
): LoadingProgress {
  const settings = { ...DEFAULT_LOADING_PROGRESS_OPTIONS, ...options }

  let target = 0
  let targetSetAt = startedAt
  let displayed = 0
  let lastUpdate = startedAt
  let ready = false

  return {
    setTarget(value, now) {
      const next = clampUnit(value)
      if (next <= target) return

      target = next
      targetSetAt = now
    },

    signalReady(now) {
      if (ready) return

      ready = true
      target = 1
      targetSetAt = now
    },

    update(now) {
      const elapsed = now - startedAt
      const timedOut = elapsed >= settings.timeoutMs
      const released = ready || timedOut

      const waiting = Math.max(0, (now - targetSetAt) / 1000)
      const creep = settings.creepLimit * (1 - Math.exp(-settings.creepRate * waiting))
      const ceiling = released ? 1 : Math.min(settings.cap, target + creep)

      const step = Math.min(MAX_STEP_SECONDS, Math.max(0, (now - lastUpdate) / 1000))
      const rate = released ? settings.readySmoothing : settings.smoothing
      lastUpdate = now
      displayed += (ceiling - displayed) * (1 - Math.exp(-rate * step))
      if (displayed > ceiling) displayed = ceiling

      const arrived = displayed >= 1 - ARRIVAL_EPSILON
      const rounded = Math.round(displayed * 100)

      return {
        displayed,
        percent: released && arrived ? 100 : Math.min(99, rounded),
        done: released && arrived && elapsed >= settings.minimumVisibleMs,
        timedOut,
      }
    },
  }
}
