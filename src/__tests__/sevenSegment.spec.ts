import { describe, expect, it } from 'vitest'

import {
  SEVEN_SEGMENT_CELL,
  SEVEN_SEGMENT_COLON,
  SEVEN_SEGMENT_LAYOUT,
  SEVEN_SEGMENT_SHAPES,
  VOLUME_DIGIT_CELLS,
  getDigitSegments,
  getReadoutLayout,
  getVolumeDigits,
  type Segment,
} from '../components/controls/sevenSegment'

describe('the seven segment digits', () => {
  const lit = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6]

  it('lights the right number of bars for each digit', () => {
    lit.forEach((count, digit) => {
      expect(getDigitSegments(digit)).toHaveLength(count)
    })
  })

  it('names each bar at most once', () => {
    for (let digit = 0; digit < 10; digit += 1) {
      const segments = getDigitSegments(digit)

      expect(new Set(segments).size).toBe(segments.length)
    }
  })

  it('tells the digits apart', () => {
    const shapes = new Set<string>()
    for (let digit = 0; digit < 10; digit += 1) {
      shapes.add([...getDigitSegments(digit)].sort().join(''))
    }

    expect(shapes.size).toBe(10)
  })

  it('lights nothing for anything that is not a digit', () => {
    expect(getDigitSegments(10)).toEqual([])
    expect(getDigitSegments(-1)).toEqual([])
    expect(getDigitSegments(Number.NaN)).toEqual([])
  })

  it('has a drawing for every bar the digits ask for', () => {
    const drawn = new Set(SEVEN_SEGMENT_SHAPES.map((shape) => shape.id))
    const used = new Set<Segment>()
    for (let digit = 0; digit < 10; digit += 1) {
      getDigitSegments(digit).forEach((segment) => used.add(segment))
    }

    expect(drawn.size).toBe(SEVEN_SEGMENT_SHAPES.length)
    expect([...used].every((segment) => drawn.has(segment))).toBe(true)
  })
})

describe('the volume reading', () => {
  it('fills the same number of cells whatever the number', () => {
    for (const percent of [0, 7, 42, 69, 99, 100]) {
      expect(getVolumeDigits(percent)).toHaveLength(VOLUME_DIGIT_CELLS)
    }
  })

  it('blanks the cells in front of the number instead of padding with zeroes', () => {
    expect(getVolumeDigits(69)).toEqual([null, 6, 9])
    expect(getVolumeDigits(5)).toEqual([null, null, 5])
  })

  it('still lights a zero that is part of the number', () => {
    expect(getVolumeDigits(100)).toEqual([1, 0, 0])
    expect(getVolumeDigits(0)).toEqual([null, null, 0])
    expect(getVolumeDigits(40)).toEqual([null, 4, 0])
  })

  it('keeps a reading that cannot be shown inside the range', () => {
    expect(getVolumeDigits(140)).toEqual([1, 0, 0])
    expect(getVolumeDigits(-8)).toEqual([null, null, 0])
    expect(getVolumeDigits(68.6)).toEqual([null, 6, 9])
  })
})

describe('laying a row of cells out', () => {
  it('leaves the volume readout exactly where it always was', () => {
    const layout = getReadoutLayout([...getVolumeDigits(69), '%'])
    const offsets = layout.cells.map((placed) => placed.offset)

    expect(offsets.slice(0, 3)).toEqual([
      0,
      SEVEN_SEGMENT_LAYOUT.cellPitch,
      SEVEN_SEGMENT_LAYOUT.cellPitch * 2,
    ])
    expect(offsets[3]).toBe(SEVEN_SEGMENT_LAYOUT.unitOffset)
    expect(layout.width).toBe(SEVEN_SEGMENT_LAYOUT.width)
  })

  it('measures the row from the cells rather than from a number', () => {
    const layout = getReadoutLayout([1, 2, ':', 3, 4])
    const last = layout.cells[layout.cells.length - 1]!

    expect(layout.width).toBe(last.offset + last.width)
    expect(layout.height).toBe(SEVEN_SEGMENT_CELL.height)
  })

  it('gives the colon a narrower cell than a digit', () => {
    const [digit, colon] = getReadoutLayout([1, ':']).cells

    expect(colon!.width).toBeLessThan(digit!.width)
  })

  it('keeps both dots of the colon inside their own cell', () => {
    const { width } = getReadoutLayout([':']).cells[0]!

    expect(SEVEN_SEGMENT_COLON).toHaveLength(2)
    SEVEN_SEGMENT_COLON.forEach((dot) => {
      dot.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(SEVEN_SEGMENT_CELL.height)
      })
    })
  })

  it('lays an empty row out without complaint', () => {
    expect(getReadoutLayout([])).toEqual({ cells: [], width: 0, height: SEVEN_SEGMENT_CELL.height })
  })
})
