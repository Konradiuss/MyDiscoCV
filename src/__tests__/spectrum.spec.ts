import { describe, expect, it } from 'vitest'

import { chaseLevel, getBandBins, getBandLevels, getLitRows, getPeakRow } from '../audio/spectrum'

const binCount = 512
const sampleRate = 48000

describe('splitting a spectrum into bands', () => {
  const bands = getBandBins(7, binCount, sampleRate, 40, 12000)

  it('gives every column a band, in order and without gaps', () => {
    expect(bands).toHaveLength(7)
    bands.forEach(([start, end]) => expect(end).toBeGreaterThan(start))

    const joins = bands.slice(1).map(([start], index) => [bands[index]![1], start])
    joins.forEach(([ends, begins]) => expect(begins).toBe(ends))
  })

  it('never runs past the bins it was given', () => {
    expect(bands[0]![0]).toBeGreaterThanOrEqual(0)
    expect(bands[bands.length - 1]![1]).toBeLessThanOrEqual(binCount)
  })

  it('widens toward the top, because hearing does', () => {
    const widths = bands.map(([start, end]) => end - start)
    const steps = widths.slice(1).map((width, index): [number, number] => [widths[index]!, width])

    steps.forEach(([narrower, wider]) => expect(wider).toBeGreaterThanOrEqual(narrower))
    expect(widths[widths.length - 1]!).toBeGreaterThan(widths[0]! * 4)
  })

  it('refuses arguments that could not describe a spectrum', () => {
    expect(() => getBandBins(0, binCount, sampleRate, 40, 12000)).toThrow(RangeError)
    expect(() => getBandBins(7, binCount, 0, 40, 12000)).toThrow(RangeError)
    expect(() => getBandBins(7, binCount, sampleRate, 0, 12000)).toThrow(RangeError)
    expect(() => getBandBins(7, binCount, sampleRate, 12000, 40)).toThrow(RangeError)
  })

  it('gives a band of its own to every column even when bins run short', () => {
    const crowded = getBandBins(7, 4, sampleRate, 40, 12000)

    expect(crowded).toHaveLength(7)
    crowded.forEach(([start, end]) => expect(end).toBeGreaterThan(start))
  })
})

describe('reading the level of a band', () => {
  it('reports a full bin as full scale', () => {
    const spectrum = new Uint8Array([0, 255, 0, 0])

    expect(getBandLevels(spectrum, [[0, 4]])).toEqual([1])
  })

  it('shows a band by its loudest bin, not its average', () => {
    const spectrum = new Uint8Array([0, 0, 0, 204])

    expect(getBandLevels(spectrum, [[0, 4]])[0]).toBeCloseTo(0.8, 5)
  })

  it('reads silence as nothing at all', () => {
    expect(getBandLevels(new Uint8Array(8), [[0, 8]])).toEqual([0])
  })
})

describe('chasing a level', () => {
  it('rises faster than it falls', () => {
    const up = chaseLevel(0, 1, 20, 4, 1 / 60)
    const down = chaseLevel(1, 0, 20, 4, 1 / 60)

    expect(up).toBeGreaterThan(1 - down)
  })

  it('always moves toward the target and never past it', () => {
    expect(chaseLevel(0.2, 0.9, 20, 4, 1 / 60)).toBeGreaterThan(0.2)
    expect(chaseLevel(0.2, 0.9, 20, 4, 1 / 60)).toBeLessThan(0.9)
    expect(chaseLevel(0.9, 0.2, 20, 4, 1 / 60)).toBeLessThan(0.9)
    expect(chaseLevel(0.9, 0.2, 20, 4, 1 / 60)).toBeGreaterThan(0.2)
  })

  it('lands on the target where there is no motion to ease', () => {
    expect(chaseLevel(0.2, 0.9, 20, 4, 0)).toBe(0.9)
    expect(chaseLevel(0.2, 0.9, 0, 0, 1 / 60)).toBe(0.9)
  })
})

describe('turning a level into divisions', () => {
  it('lights none at silence and all at full scale', () => {
    expect(getLitRows(0, 8)).toBe(0)
    expect(getLitRows(1, 8)).toBe(8)
  })

  it('never goes outside the column, whatever it is handed', () => {
    expect(getLitRows(-4, 8)).toBe(0)
    expect(getLitRows(9, 8)).toBe(8)
    expect(getLitRows(Number.NaN, 8)).toBe(0)
  })

  it('climbs with the level', () => {
    const counts = [0, 0.25, 0.5, 0.75, 1].map((level) => getLitRows(level, 8))

    expect(counts).toEqual([0, 2, 4, 6, 8])
  })
})

describe('the cap that hangs at the high water mark', () => {
  it('jumps to a new peak at once', () => {
    expect(getPeakRow(2, 6, 4, 1 / 60)).toBe(6)
  })

  it('sinks when the level drops, and no further than the floor', () => {
    const sunk = getPeakRow(6, 0, 4, 0.5)

    expect(sunk).toBe(4)
    expect(getPeakRow(0.1, 0, 4, 1)).toBe(0)
  })

  it('never sinks below what is lit under it', () => {
    expect(getPeakRow(6, 5, 40, 1)).toBe(5)
  })
})
