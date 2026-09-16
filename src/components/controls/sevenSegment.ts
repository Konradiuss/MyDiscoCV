export type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

export const SEVEN_SEGMENT_VIEWBOX = '0 0 12 20'

export const SEVEN_SEGMENT_CELL = { width: 12, height: 20 } as const

export const SEVEN_SEGMENT_LAYOUT = { cellPitch: 17, unitOffset: 52, width: 64 } as const

export interface SegmentShape {
  readonly id: Segment
  readonly points: readonly (readonly [number, number])[]
}

export const SEVEN_SEGMENT_SHAPES: readonly SegmentShape[] = [
  {
    id: 'a',
    points: [
      [1.2, 0],
      [10.8, 0],
      [12, 1.2],
      [10.8, 2.4],
      [1.2, 2.4],
      [0, 1.2],
    ],
  },
  {
    id: 'b',
    points: [
      [9.6, 4.3],
      [10.8, 3.1],
      [12, 4.3],
      [12, 6.9],
      [10.8, 8.1],
      [9.6, 6.9],
    ],
  },
  {
    id: 'c',
    points: [
      [9.6, 13.1],
      [10.8, 11.9],
      [12, 13.1],
      [12, 15.7],
      [10.8, 16.9],
      [9.6, 15.7],
    ],
  },
  {
    id: 'd',
    points: [
      [1.2, 17.6],
      [10.8, 17.6],
      [12, 18.8],
      [10.8, 20],
      [1.2, 20],
      [0, 18.8],
    ],
  },
  {
    id: 'e',
    points: [
      [0, 13.1],
      [1.2, 11.9],
      [2.4, 13.1],
      [2.4, 15.7],
      [1.2, 16.9],
      [0, 15.7],
    ],
  },
  {
    id: 'f',
    points: [
      [0, 4.3],
      [1.2, 3.1],
      [2.4, 4.3],
      [2.4, 6.9],
      [1.2, 8.1],
      [0, 6.9],
    ],
  },
  {
    id: 'g',
    points: [
      [1.2, 8.8],
      [10.8, 8.8],
      [12, 10],
      [10.8, 11.2],
      [1.2, 11.2],
      [0, 10],
    ],
  },
]

export const SEVEN_SEGMENT_COLON: readonly (readonly (readonly [number, number])[])[] = [
  [
    [1.3, 4.8],
    [3.7, 4.8],
    [3.7, 7.2],
    [1.3, 7.2],
  ],
  [
    [1.3, 12.8],
    [3.7, 12.8],
    [3.7, 15.2],
    [1.3, 15.2],
  ],
]

export type ReadoutCell = number | null | ':' | '%'

const CELL_SIZES: Record<'digit' | 'colon' | 'unit', { width: number; gap: number }> = {
  digit: { width: SEVEN_SEGMENT_CELL.width, gap: 5 },
  colon: { width: 5, gap: 5 },
  unit: { width: SEVEN_SEGMENT_CELL.width, gap: 6 },
}

function kindOf(cell: ReadoutCell) {
  if (cell === ':') return 'colon'

  return cell === '%' ? 'unit' : 'digit'
}

export interface ReadoutPlacement {
  readonly cell: ReadoutCell
  readonly offset: number
  readonly width: number
}

export interface ReadoutLayout {
  readonly cells: readonly ReadoutPlacement[]
  readonly width: number
  readonly height: number
}

export function getReadoutLayout(cells: readonly ReadoutCell[]): ReadoutLayout {
  let offset = 0
  const placed = cells.map((cell, index) => {
    const { width, gap } = CELL_SIZES[kindOf(cell)]
    if (index > 0) offset += gap

    const placement: ReadoutPlacement = { cell, offset, width }
    offset += width

    return placement
  })

  return { cells: placed, width: offset, height: SEVEN_SEGMENT_CELL.height }
}

export function toSvgPoints(points: readonly (readonly [number, number])[]) {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

const DIGIT_SEGMENTS: readonly (readonly Segment[])[] = [
  ['a', 'b', 'c', 'd', 'e', 'f'],
  ['b', 'c'],
  ['a', 'b', 'g', 'e', 'd'],
  ['a', 'b', 'g', 'c', 'd'],
  ['f', 'g', 'b', 'c'],
  ['a', 'f', 'g', 'c', 'd'],
  ['a', 'f', 'g', 'e', 'c', 'd'],
  ['a', 'b', 'c'],
  ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  ['a', 'b', 'c', 'd', 'f', 'g'],
]

export function getDigitSegments(digit: number): readonly Segment[] {
  return DIGIT_SEGMENTS[digit] ?? []
}

export const VOLUME_DIGIT_CELLS = 3

export function getVolumeDigits(percent: number): readonly (number | null)[] {
  const whole = Math.min(100, Math.max(0, Math.round(percent)))
  const cells: (number | null)[] = []

  for (let place = VOLUME_DIGIT_CELLS - 1; place >= 0; place -= 1) {
    const unit = 10 ** place
    const digit = Math.floor(whole / unit) % 10
    const blank = digit === 0 && whole < unit && place > 0

    cells.push(blank ? null : digit)
  }

  return cells
}
