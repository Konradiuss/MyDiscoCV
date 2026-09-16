import type { LabelPattern } from '@/types/music'

const SQRT3 = Math.sqrt(3)
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

interface Stop {
  readonly at: number
  readonly color: string
}

export function getGradientLine(width: number, height: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180
  const towardX = Math.sin(angle)
  const towardY = -Math.cos(angle)
  const length = Math.abs(width * towardX) + Math.abs(height * towardY)

  return {
    fromX: width / 2 - (towardX * length) / 2,
    fromY: height / 2 - (towardY * length) / 2,
    toX: width / 2 + (towardX * length) / 2,
    toY: height / 2 + (towardY * length) / 2,
    length,
  }
}

export function getFarthestCornerRadius(width: number, height: number) {
  return Math.hypot(width / 2, height / 2)
}

function addStops<T extends CanvasGradient>(gradient: T, stops: readonly Stop[]) {
  stops.forEach((stop) => gradient.addColorStop(Math.min(1, Math.max(0, stop.at)), stop.color))
  return gradient
}

function conic(
  context: CanvasRenderingContext2D,
  centreX: number,
  centreY: number,
  fromDeg: number,
  stops: readonly Stop[],
) {
  return addStops(
    context.createConicGradient(((fromDeg - 90) * Math.PI) / 180, centreX, centreY),
    stops,
  )
}

function linear(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDeg: number,
  stops: readonly Stop[],
) {
  const line = getGradientLine(width, height, angleDeg)

  return addStops(context.createLinearGradient(line.fromX, line.fromY, line.toX, line.toY), stops)
}

function radial(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stops: readonly Stop[],
) {
  const radius = getFarthestCornerRadius(width, height)

  return addStops(
    context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius),
    stops,
  )
}

interface TileLayer {
  readonly width: number
  readonly height: number
  readonly offsetX?: number
  readonly offsetY?: number
  readonly paint: (tile: CanvasRenderingContext2D, width: number, height: number) => void
}

function repeatTile(context: CanvasRenderingContext2D, area: number, layer: TileLayer) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(layer.width))
  canvas.height = Math.max(1, Math.round(layer.height))

  const tile = canvas.getContext('2d')
  if (!tile) return

  layer.paint(tile, canvas.width, canvas.height)

  const pattern = context.createPattern(canvas, 'repeat')
  if (!pattern) return

  pattern.setTransform(new DOMMatrix().translate(layer.offsetX ?? 0, layer.offsetY ?? 0))
  context.fillStyle = pattern
  context.fillRect(0, 0, area, area)
}

function drawCubes(context: CanvasRenderingContext2D, size: number) {
  const s = size / 4.5
  const wide = 2 * s * SQRT3
  const tall = 2 * s
  const c1 = '#b62f31'
  const c2 = '#ecdacb'
  const c3 = '#8e1f08'

  const shadedFace: TileLayer['paint'] = (tile, width, height) => {
    tile.fillStyle = conic(tile, width * 0.625, height / 2, 60, [
      { at: 0, color: c3 },
      { at: 1 / 6, color: c3 },
      { at: 1 / 6, color: TRANSPARENT },
      { at: 1, color: TRANSPARENT },
    ])
    tile.fillRect(0, 0, width, height)
  }

  repeatTile(context, size, {
    width: s * SQRT3,
    height: s,
    paint: (tile, width, height) => {
      tile.fillStyle = conic(tile, width / 2, height / 2, 60, [
        { at: 0, color: c1 },
        { at: 1 / 6, color: c1 },
        { at: 1 / 6, color: c2 },
        { at: 1 / 2, color: c2 },
        { at: 1 / 2, color: c1 },
        { at: 2 / 3, color: c1 },
        { at: 2 / 3, color: c2 },
        { at: 1, color: c2 },
      ])
      tile.fillRect(0, 0, width, height)
    },
  })

  repeatTile(context, size, {
    width: wide,
    height: tall,
    paint: (tile, width, height) => {
      tile.fillStyle = conic(tile, width / 2, height / 2, 0, [
        { at: 0, color: c2 },
        { at: 1 / 4, color: c2 },
        { at: 1 / 4, color: TRANSPARENT },
        { at: 1 / 2, color: TRANSPARENT },
        { at: 1 / 2, color: c2 },
        { at: 3 / 4, color: c2 },
        { at: 3 / 4, color: TRANSPARENT },
        { at: 1, color: TRANSPARENT },
      ])
      tile.fillRect(0, 0, width, height)
    },
  })

  repeatTile(context, size, {
    width: wide,
    height: tall,
    offsetX: (-0.866 * s) / 2,
    offsetY: -s / 2,
    paint: shadedFace,
  })
  repeatTile(context, size, {
    width: wide,
    height: tall,
    offsetX: (2.598 * s) / 2,
    offsetY: s / 2,
    paint: shadedFace,
  })
}

function drawStairs(context: CanvasRenderingContext2D, size: number) {
  const s = size / 4
  const tile = 2 * s
  const c1 = '#ffdc56'
  const c2 = '#fe6601'
  const c3 = '#803201'

  const quarter = (color: string, centreShare: number): TileLayer['paint'] => {
    return (tileContext, width, height) => {
      tileContext.fillStyle = conic(tileContext, width * centreShare, height / 2, 0, [
        { at: 0, color },
        { at: 1 / 4, color },
        { at: 1 / 4, color: TRANSPARENT },
        { at: 1, color: TRANSPARENT },
      ])
      tileContext.fillRect(0, 0, width, height)
    }
  }

  repeatTile(context, size, {
    width: s,
    height: s,
    paint: (tileContext, width, height) => {
      tileContext.fillStyle = linear(tileContext, width, height, 180, [
        { at: 0, color: c1 },
        { at: 1 / 3, color: c1 },
        { at: 1 / 3, color: c2 },
        { at: 2 / 3, color: c2 },
        { at: 2 / 3, color: c3 },
        { at: 1, color: c3 },
      ])
      tileContext.fillRect(0, 0, width, height)
    },
  })

  repeatTile(context, size, {
    width: tile,
    height: tile,
    paint: (tileContext, width, height) => {
      tileContext.fillStyle = conic(tileContext, width / 2, height / 2, 0, [
        { at: 0, color: c1 },
        { at: 1 / 4, color: c1 },
        { at: 1 / 4, color: TRANSPARENT },
        { at: 1 / 2, color: TRANSPARENT },
        { at: 1 / 2, color: c1 },
        { at: 3 / 4, color: c1 },
        { at: 3 / 4, color: TRANSPARENT },
        { at: 1, color: TRANSPARENT },
      ])
      tileContext.fillRect(0, 0, width, height)
    },
  })

  repeatTile(context, size, { width: tile, height: tile, paint: quarter(c2, 2 / 3) })
  repeatTile(context, size, {
    width: tile,
    height: tile,
    offsetX: s,
    offsetY: s,
    paint: quarter(c2, 2 / 3),
  })
  repeatTile(context, size, { width: tile, height: tile, paint: quarter(c3, 5 / 6) })
  repeatTile(context, size, {
    width: tile,
    height: tile,
    offsetX: s,
    offsetY: s,
    paint: quarter(c3, 5 / 6),
  })
}

function drawScales(context: CanvasRenderingContext2D, size: number) {
  const s = size / 3.5
  const c1 = '#e8bfdb'
  const c2 = '#700a6d'

  const lattice = (angleDeg: number): TileLayer['paint'] => {
    return (tileContext, width, height) => {
      tileContext.fillStyle = linear(tileContext, width, height, angleDeg, [
        { at: 0, color: TRANSPARENT },
        { at: 0.71, color: TRANSPARENT },
        { at: 0.71, color: c1 },
        { at: 0.79, color: c1 },
        { at: 0.79, color: TRANSPARENT },
        { at: 1, color: TRANSPARENT },
      ])
      tileContext.fillRect(0, 0, width, height)
    }
  }

  repeatTile(context, size, {
    width: s,
    height: s,
    paint: (tileContext, width, height) => {
      tileContext.fillStyle = radial(tileContext, width, height, [
        { at: 0, color: c1 },
        { at: 0.35, color: c1 },
        { at: 0.37, color: c2 },
        { at: 1, color: c2 },
      ])
      tileContext.fillRect(0, 0, width, height)
    },
  })

  repeatTile(context, size, {
    width: 2 * s,
    height: 2 * s,
    offsetX: s / 2,
    offsetY: s / 2,
    paint: lattice(135),
  })
  repeatTile(context, size, {
    width: 2 * s,
    height: 2 * s,
    offsetX: -s / 2,
    offsetY: s / 2,
    paint: lattice(45),
  })
}

const PATTERNS: Record<LabelPattern, (context: CanvasRenderingContext2D, size: number) => void> = {
  cubes: drawCubes,
  stairs: drawStairs,
  scales: drawScales,
}

const PLAIN: Record<LabelPattern, string> = {
  cubes: '#b62f31',
  stairs: '#ffdc56',
  scales: '#700a6d',
}

export function drawLabelPattern(
  context: CanvasRenderingContext2D,
  pattern: LabelPattern,
  size: number,
) {
  if (typeof context.createConicGradient !== 'function') {
    context.fillStyle = PLAIN[pattern]
    context.fillRect(0, 0, size, size)
    return
  }

  PATTERNS[pattern](context, size)
}
