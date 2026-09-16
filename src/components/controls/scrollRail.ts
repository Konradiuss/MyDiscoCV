import { finite, type ScrollMetrics } from './pageScroll'

export const SCROLL_RAIL_MIN_THUMB = 36

export const SCROLL_RAIL_EDGE = 72

export const SCROLL_RAIL_IDLE = 900

export interface RailThumb {
  readonly height: number
  readonly offset: number
}

function thumbHeightOf(metrics: ScrollMetrics, trackHeight: number) {
  const viewport = Math.max(0, finite(metrics.viewportHeight))
  const documentHeight = Math.max(1, finite(metrics.documentHeight, 1))
  const proportional = trackHeight * (viewport / documentHeight)

  return Math.min(trackHeight, Math.max(SCROLL_RAIL_MIN_THUMB, proportional))
}

function travelOf(metrics: ScrollMetrics) {
  const viewport = Math.max(0, finite(metrics.viewportHeight))
  const documentHeight = Math.max(0, finite(metrics.documentHeight))

  return Math.max(0, documentHeight - viewport)
}

export function getRailThumb(metrics: ScrollMetrics, trackHeight: number): RailThumb | null {
  const track = Math.max(0, finite(trackHeight))
  const travel = travelOf(metrics)

  if (travel <= 0 || track <= 0) return null

  const height = thumbHeightOf(metrics, track)

  const thumbTravel = Math.max(0, track - height)
  const scrollTop = Math.min(Math.max(0, finite(metrics.scrollTop)), travel)

  return { height, offset: (scrollTop / travel) * thumbTravel }
}

export function getScrollFromThumb(
  offset: number,
  metrics: ScrollMetrics,
  trackHeight: number,
): number {
  const track = Math.max(0, finite(trackHeight))
  const travel = travelOf(metrics)

  if (travel <= 0 || track <= 0) return 0

  const thumbTravel = Math.max(0, track - thumbHeightOf(metrics, track))

  if (thumbTravel <= 0) return 0

  const fraction = Math.min(1, Math.max(0, finite(offset) / thumbTravel))

  return fraction * travel
}

export function isNearRightEdge(clientX: number, viewportWidth: number) {
  if (!Number.isFinite(clientX) || !Number.isFinite(viewportWidth)) return false

  return viewportWidth - clientX <= SCROLL_RAIL_EDGE
}
