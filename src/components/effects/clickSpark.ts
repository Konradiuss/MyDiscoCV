export type ClickSparkEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

export interface ClickSpark {
  readonly x: number
  readonly y: number
  readonly angle: number
  readonly startTime: number
}

export interface ClickSparkLineOptions {
  readonly sparkSize: number
  readonly sparkRadius: number
  readonly duration: number
  readonly extraScale: number
  readonly easing: ClickSparkEasing
}

export interface ClickSparkLine {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly alpha: number
}

export const CLICK_SPARK_DRAG_TOLERANCE = 6

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function easeClickSpark(progress: number, easing: ClickSparkEasing) {
  const t = clampUnit(progress)

  switch (easing) {
    case 'linear':
      return t
    case 'ease-in':
      return t * t
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'ease-out':
      return t * (2 - t)
  }
}

export function createClickSparkBurst(x: number, y: number, startTime: number, count: number) {
  const sparks = Math.max(0, Math.floor(count))
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(startTime) || sparks === 0) {
    return []
  }

  return Array.from({ length: sparks }, (_, index): ClickSpark => {
    return {
      x,
      y,
      angle: (Math.PI * 2 * index) / sparks,
      startTime,
    }
  })
}

export function isClickSparkDrag(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  tolerance = CLICK_SPARK_DRAG_TOLERANCE,
) {
  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(currentX) ||
    !Number.isFinite(currentY)
  ) {
    return false
  }

  const distanceX = currentX - startX
  const distanceY = currentY - startY
  return distanceX * distanceX + distanceY * distanceY > tolerance * tolerance
}

export function getClickSparkLine(
  spark: ClickSpark,
  now: number,
  options: ClickSparkLineOptions,
): ClickSparkLine | null {
  if (options.duration <= 0) return null

  const elapsed = now - spark.startTime
  if (elapsed < 0 || elapsed >= options.duration) return null

  const progress = elapsed / options.duration
  const eased = easeClickSpark(progress, options.easing)
  const distance = eased * options.sparkRadius * options.extraScale
  const lineLength = options.sparkSize * (1 - eased)
  const directionX = Math.cos(spark.angle)
  const directionY = Math.sin(spark.angle)

  return {
    x1: spark.x + distance * directionX,
    y1: spark.y + distance * directionY,
    x2: spark.x + (distance + lineLength) * directionX,
    y2: spark.y + (distance + lineLength) * directionY,
    alpha: 1 - eased,
  }
}
