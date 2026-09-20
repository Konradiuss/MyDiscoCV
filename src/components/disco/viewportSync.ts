/**
 * Keeping the room in step with the window, without doing it more than once.
 *
 * A phone moves its address bar while you scroll, which fires a resize on every
 * pixel of the animation. Three.js reallocates the drawing buffer on any call to
 * setSize, even one that changes nothing, and the floor and the grid are rebuilt
 * from scratch whenever the aspect or the height moves at all. So the work is
 * split: what is cheap is applied on the next frame, what is expensive waits for
 * the window to settle, and neither runs when the numbers have not moved.
 */

/** Below this the room is framed for a phone. */
export const PHONE_VIEWPORT_WIDTH = 720

/**
 * Framing only — how the room is composed, never how much it costs to draw.
 * That question lives in sceneQuality.ts.
 *
 * The one definition matters: the component used to ask this inline, sometimes
 * as `innerWidth < 720` and sometimes as `matchMedia('(max-width: 720px)')`,
 * and at exactly 720px those two disagree.
 */
export function isNarrowViewport(width: number = window.innerWidth) {
  return width < PHONE_VIEWPORT_WIDTH
}

export interface ViewportReading {
  readonly width: number
  readonly height: number
  readonly devicePixelRatio: number
}

export interface SceneViewport {
  readonly width: number
  readonly height: number
  readonly pixelRatio: number
  readonly fov: number
}

export interface ViewportLimits {
  readonly maxPixelRatio: number
}

/**
 * `limits` is optional, and its default reproduces what the width alone used to
 * decide. Callers that know the quality tier pass it; everything else, including
 * every existing test, keeps the old behaviour.
 *
 * Field of view stays on the width and is never handed to the caller: framing is
 * composition, and a machine demoted for being slow must not re-frame the room.
 */
export function getSceneViewport(reading: ViewportReading, limits?: ViewportLimits): SceneViewport {
  const phone = reading.width < PHONE_VIEWPORT_WIDTH
  const ratio = reading.devicePixelRatio > 0 ? reading.devicePixelRatio : 1

  return {
    width: reading.width,
    height: reading.height,
    // A phone is asked for fewer pixels than it offers; the halo is fill-bound.
    pixelRatio: Math.min(ratio, limits ? limits.maxPixelRatio : phone ? 1.5 : 1.8),
    fov: phone ? 31 : 35,
  }
}

export function needsRendererResize(applied: SceneViewport | null, next: SceneViewport) {
  return (
    applied === null ||
    applied.width !== next.width ||
    applied.height !== next.height ||
    applied.pixelRatio !== next.pixelRatio
  )
}

export function needsCameraUpdate(applied: SceneViewport | null, next: SceneViewport) {
  return (
    applied === null ||
    applied.fov !== next.fov ||
    applied.width !== next.width ||
    applied.height !== next.height
  )
}

export interface TrailingCall {
  /** Start, or restart, the wait. */
  schedule(): void
  /** Run now if something is waiting. */
  flush(): void
  cancel(): void
}

/** Runs once the calls stop coming, which is when the address bar has settled. */
export function createTrailingCall(run: () => void, delayMs: number): TrailingCall {
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    schedule() {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        run()
      }, delayMs)
    },

    flush() {
      if (timer === null) return

      clearTimeout(timer)
      timer = null
      run()
    },

    cancel() {
      if (timer === null) return

      clearTimeout(timer)
      timer = null
    },
  }
}
