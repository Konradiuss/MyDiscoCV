import { describe, expect, it } from 'vitest'

import {
  getClockCells,
  getElapsedCells,
  getMillisecondsToNextMinute,
} from '../components/controls/clock'

function at(hours: number, minutes: number, seconds = 0, milliseconds = 0) {
  return new Date(2026, 0, 2, hours, minutes, seconds, milliseconds)
}

describe('the wall clock', () => {
  it('reads the hour and the minute, twenty four hour', () => {
    expect(getClockCells(at(23, 50))).toEqual([2, 3, ':', 5, 0])
  })

  it('lights the leading zero of the hour, unlike everything else here', () => {
    expect(getClockCells(at(9, 5))).toEqual([0, 9, ':', 0, 5])
  })

  it('shows midnight as a reading rather than as nothing', () => {
    expect(getClockCells(at(0, 0))).toEqual([0, 0, ':', 0, 0])
  })

  it('reads zero from a date that is not one', () => {
    expect(getClockCells(new Date(Number.NaN))).toEqual([0, 0, ':', 0, 0])
  })
})

describe('the track counter', () => {
  it('counts minutes and seconds', () => {
    expect(getElapsedCells(227)).toEqual([null, 3, ':', 4, 7])
  })

  it('blanks the leading zero of the minutes', () => {
    expect(getElapsedCells(9)).toEqual([null, 0, ':', 0, 9])
    expect(getElapsedCells(605)).toEqual([1, 0, ':', 0, 5])
  })

  it('drops the part of a second nobody can see', () => {
    expect(getElapsedCells(47.9)).toEqual([null, 0, ':', 4, 7])
  })

  it('pins a run past ninety nine minutes rather than rolling over', () => {
    expect(getElapsedCells(99 * 60)).toEqual([9, 9, ':', 5, 9])
    expect(getElapsedCells(500 * 60)).toEqual([9, 9, ':', 5, 9])
  })

  it('reads zero from anything that is not a count', () => {
    expect(getElapsedCells(-30)).toEqual([null, 0, ':', 0, 0])
    expect(getElapsedCells(Number.NaN)).toEqual([null, 0, ':', 0, 0])
    expect(getElapsedCells(Number.POSITIVE_INFINITY)).toEqual([null, 0, ':', 0, 0])
  })
})

describe('waiting for the minute to turn', () => {
  it('measures what is left of the minute', () => {
    expect(getMillisecondsToNextMinute(at(12, 30, 59, 200))).toBe(800)
    expect(getMillisecondsToNextMinute(at(12, 30, 30, 0))).toBe(30000)
  })

  it('gives a whole minute on the boundary, having only just turned over', () => {
    expect(getMillisecondsToNextMinute(at(12, 30, 0, 0))).toBe(60000)
  })

  it('never asks to be woken in the past', () => {
    for (const seconds of [0, 1, 17, 42, 59]) {
      const wait = getMillisecondsToNextMinute(at(4, 5, seconds, 999))
      expect(wait).toBeGreaterThan(0)
      expect(wait).toBeLessThanOrEqual(60000)
    }
  })

  it('falls back to a whole minute for a date that is not one', () => {
    expect(getMillisecondsToNextMinute(new Date(Number.NaN))).toBe(60000)
  })
})
