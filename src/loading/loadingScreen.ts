import type { BallScreenGeometry } from '@/components/disco/ballProjection'
import { createLoadingProgress, type LoadingProgress } from './loadingProgress'

export const LOADING_MILESTONES = {
  appMounted: 0.08,
  sceneChunkLoaded: 0.35,
  sceneBuildEnd: 0.92,
} as const

/** Must match the exit transition in the overlay stylesheet. */
const EXIT_DURATION_MS = 900
const EXIT_CLEANUP_MARGIN_MS = 250

const DISC_ARTWORK_SCALE = 1.0671

const FALLBACK_BALL = {
  desktop: { top: 34, size: 280 },
  mobile: { top: 42, size: 230 },
} as const
const MOBILE_QUERY = '(max-width: 720px)'

let ballTarget: BallScreenGeometry | null = null
let overlay: HTMLElement | null = null
let disc: HTMLElement | null = null
let percentLabel: HTMLElement | null = null
let progress: LoadingProgress | null = null
let frame = 0
let lastPercent = -1
let leaving = false
let gone = false
const goneListeners = new Set<() => void>()

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setScrollLocked(locked: boolean) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

function getFallbackBallTarget(): BallScreenGeometry {
  const ball = window.matchMedia(MOBILE_QUERY).matches
    ? FALLBACK_BALL.mobile
    : FALLBACK_BALL.desktop

  return {
    centerX: window.innerWidth / 2,
    centerY: ball.top + ball.size / 2,
    diameter: ball.size,
  }
}

function applyExitTransform() {
  if (!disc) return

  const rect = disc.getBoundingClientRect()
  if (rect.width === 0) return

  const ball = ballTarget ?? getFallbackBallTarget()

  disc.style.setProperty('--loading-exit-x', `${ball.centerX - (rect.left + rect.width / 2)}px`)
  disc.style.setProperty('--loading-exit-y', `${ball.centerY - (rect.top + rect.height / 2)}px`)
  disc.style.setProperty(
    '--loading-exit-scale',
    `${(ball.diameter / rect.width) * DISC_ARTWORK_SCALE}`,
  )
}

function teardown() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  overlay?.remove()
  overlay = null
  disc = null
  percentLabel = null
  progress = null
  setScrollLocked(false)

  gone = true
  goneListeners.forEach((listener) => listener())
  goneListeners.clear()
}

function leave() {
  if (!overlay || leaving) return

  leaving = true
  if (frame) cancelAnimationFrame(frame)
  frame = 0

  if (prefersReducedMotion()) {
    overlay.classList.add('is-instant')
  } else {
    applyExitTransform()
  }

  overlay.classList.add('is-leaving')
  overlay.setAttribute('aria-hidden', 'true')

  window.setTimeout(teardown, EXIT_DURATION_MS + EXIT_CLEANUP_MARGIN_MS)
}

function tick(now: number) {
  frame = 0
  if (!progress || !overlay) return

  const state = progress.update(now)

  if (state.percent !== lastPercent) {
    lastPercent = state.percent
    if (percentLabel) percentLabel.textContent = String(state.percent)
    overlay.setAttribute('aria-valuenow', String(state.percent))
  }

  if (state.done) {
    leave()
    return
  }

  frame = requestAnimationFrame(tick)
}

export function startLoadingScreen() {
  if (typeof document === 'undefined') return

  overlay = document.getElementById('loading-screen')
  if (!overlay) return

  disc = overlay.querySelector('.loading-screen__disc')
  percentLabel = overlay.querySelector('.loading-screen__percent-value')
  progress = createLoadingProgress(performance.now())

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
  setScrollLocked(true)

  frame = requestAnimationFrame(tick)
}

export function whenLoadingScreenGone(): Promise<void> {
  if (gone) return Promise.resolve()
  if (typeof document !== 'undefined' && !document.getElementById('loading-screen')) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    goneListeners.add(resolve)
  })
}

export function reportLoadingProgress(value: number) {
  progress?.setTarget(value, performance.now())
}

export function signalLoadingReady(ball: BallScreenGeometry | null = null) {
  ballTarget = ball
  progress?.signalReady(performance.now())
}
