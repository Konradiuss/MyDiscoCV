import { finite, type ScrollMetrics } from './pageScroll'

export type ScrollEnd = 'top' | 'bottom' | null

export type { ScrollMetrics }

export const SCROLL_END_ENTER = 0.5
export const SCROLL_END_LEAVE = 0.75

export const SCROLL_END_MIN_TRAVEL = 1

export function getScrollEnd(metrics: ScrollMetrics, previous: ScrollEnd = null): ScrollEnd {
  const viewport = Math.max(1, finite(metrics.viewportHeight))
  const documentHeight = Math.max(0, finite(metrics.documentHeight))
  const travel = documentHeight - viewport

  if (travel < viewport * SCROLL_END_MIN_TRAVEL) return null

  const scrollTop = Math.min(Math.max(0, finite(metrics.scrollTop)), travel)
  const fromTop = scrollTop / viewport
  const fromBottom = (travel - scrollTop) / viewport

  if (previous === 'top' && fromTop <= SCROLL_END_LEAVE) return 'top'
  if (previous === 'bottom' && fromBottom <= SCROLL_END_LEAVE) return 'bottom'

  if (fromTop <= SCROLL_END_ENTER && fromTop <= fromBottom) return 'top'
  if (fromBottom <= SCROLL_END_ENTER) return 'bottom'

  return null
}

export function getScrollTarget(end: ScrollEnd, documentHeight: number) {
  return end === 'top' ? Math.max(0, finite(documentHeight)) : 0
}
