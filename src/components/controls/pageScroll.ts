export interface ScrollMetrics {
  readonly scrollTop: number
  readonly viewportHeight: number
  readonly documentHeight: number
}

export function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

export function measurePage(): ScrollMetrics {
  const view = document.documentElement

  return {
    scrollTop: window.scrollY || view.scrollTop || 0,
    viewportHeight: window.innerHeight,
    documentHeight: Math.max(view.scrollHeight, document.body?.scrollHeight ?? 0),
  }
}

export function isScrollLocked() {
  return getComputedStyle(document.documentElement).overflowY === 'hidden'
}
