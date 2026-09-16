import { SEVEN_SEGMENT_CELL, SEVEN_SEGMENT_LAYOUT, SEVEN_SEGMENT_SHAPES } from './sevenSegment'

export const METER_DIVISION = SEVEN_SEGMENT_SHAPES[0]!

export interface MeterGrid {
  readonly width: number
  readonly height: number
  readonly columnPitch: number
  readonly rowStep: number
  readonly divisionWidth: number
  readonly divisionHeight: number
}

export function getMeterGrid(columns: number, rows: number, rowPitch: number): MeterGrid {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new RangeError('columns must be a positive integer')
  }
  if (!Number.isInteger(rows) || rows <= 0) throw new RangeError('rows must be a positive integer')
  if (!(rowPitch >= 1)) throw new RangeError('rowPitch must be at least 1, or rows would overlap')

  const tops = METER_DIVISION.points.map(([, y]) => y)
  const divisionHeight = Math.max(...tops) - Math.min(...tops)
  const divisionWidth = SEVEN_SEGMENT_CELL.width
  const columnPitch = SEVEN_SEGMENT_LAYOUT.cellPitch
  const rowStep = divisionHeight * rowPitch

  return {
    width: (columns - 1) * columnPitch + divisionWidth,
    height: (rows - 1) * rowStep + divisionHeight,
    columnPitch,
    rowStep,
    divisionWidth,
    divisionHeight,
  }
}
