import { describe, expect, it } from 'vitest'

import {
  SCROLL_RAIL_EDGE,
  SCROLL_RAIL_MIN_THUMB,
  getRailThumb,
  getScrollFromThumb,
  isNearRightEdge,
} from '../components/controls/scrollRail'

const TRACK = 764

function page(screensFromTop: number, screens = 10) {
  const viewportHeight = 800

  return {
    scrollTop: screensFromTop * viewportHeight,
    viewportHeight,
    documentHeight: screens * viewportHeight,
  }
}

describe('the capsule', () => {
  it('takes the window’s share of the document for its height', () => {
    expect(getRailThumb(page(0, 4), TRACK)?.height).toBeCloseTo(TRACK / 4)
  })

  it('starts at the top of the track at the top of the page', () => {
    expect(getRailThumb(page(0), TRACK)?.offset).toBe(0)
  })

  it('ends flush with the bottom of the track at the bottom of the page', () => {
    const bottom = getRailThumb(page(9), TRACK)

    expect(bottom).not.toBeNull()
    expect(bottom!.offset + bottom!.height).toBeCloseTo(TRACK)
  })

  it('is held at a size that can still be grabbed', () => {
    const tall = getRailThumb(page(0, 100), TRACK)

    expect(tall?.height).toBe(SCROLL_RAIL_MIN_THUMB)
  })

  it('still ends flush once its height has been held at the floor', () => {
    const bottom = getRailThumb(page(99, 100), TRACK)

    expect(bottom!.height).toBe(SCROLL_RAIL_MIN_THUMB)
    expect(bottom!.offset + bottom!.height).toBeCloseTo(TRACK)
  })

  it('never grows past the track it is drawn in', () => {
    expect(getRailThumb({ ...page(0, 1.01), viewportHeight: 800 }, 20)?.height).toBeLessThanOrEqual(
      20,
    )
  })
})

describe('the two mappings are the same mapping', () => {
  it('gives back the scroll position the capsule was drawn from', () => {
    for (const screens of [2, 4, 10, 100]) {
      for (const at of [0, 0.25, 0.5, 0.75, 1]) {
        const metrics = page(at * (screens - 1), screens)
        const drawn = getRailThumb(metrics, TRACK)

        expect(getScrollFromThumb(drawn!.offset, metrics, TRACK)).toBeCloseTo(metrics.scrollTop)
      }
    }
  })

  it('clamps a drag past either end of the track', () => {
    const metrics = page(5)

    expect(getScrollFromThumb(-400, metrics, TRACK)).toBe(0)
    expect(getScrollFromThumb(TRACK * 2, metrics, TRACK)).toBeCloseTo(9 * 800)
  })
})

describe('pages with nowhere to go', () => {
  it('draws nothing when the page fits the window', () => {
    expect(
      getRailThumb({ scrollTop: 0, viewportHeight: 800, documentHeight: 600 }, TRACK),
    ).toBeNull()
    expect(
      getRailThumb({ scrollTop: 0, viewportHeight: 800, documentHeight: 800 }, TRACK),
    ).toBeNull()
  })

  it('draws nothing for a page reported as held still', () => {
    expect(getRailThumb(page(0, 1), TRACK)).toBeNull()
  })

  it('draws nothing before the track has been measured', () => {
    expect(getRailThumb(page(0), 0)).toBeNull()
  })

  it('asks for no scroll when there is none to ask for', () => {
    expect(getScrollFromThumb(300, page(0, 1), TRACK)).toBe(0)
    expect(getScrollFromThumb(300, page(0), 0)).toBe(0)
  })
})

describe('measurements that are not measurements', () => {
  it('survives numbers that are not numbers', () => {
    const drawn = getRailThumb(
      {
        scrollTop: Number.NaN,
        viewportHeight: Number.NaN,
        documentHeight: Number.POSITIVE_INFINITY,
      },
      TRACK,
    )

    expect(drawn).toBeNull()
    expect(getRailThumb(page(5), Number.NaN)).toBeNull()
    expect(getScrollFromThumb(Number.NaN, page(5), TRACK)).toBe(0)
  })

  it('clamps a scroll position past either end', () => {
    expect(getRailThumb({ ...page(0), scrollTop: -180 }, TRACK)?.offset).toBe(0)

    const past = getRailThumb({ ...page(9), scrollTop: 99999 }, TRACK)
    expect(past!.offset + past!.height).toBeCloseTo(TRACK)
  })
})

describe('the band that wakes the rail', () => {
  it('answers to the edge and to the orb in front of it', () => {
    expect(isNearRightEdge(1920, 1920)).toBe(true)
    expect(isNearRightEdge(1920 - SCROLL_RAIL_EDGE, 1920)).toBe(true)
    expect(isNearRightEdge(1920 - 66, 1920)).toBe(true)
  })

  it('does not answer to the rest of the page', () => {
    expect(isNearRightEdge(1920 - SCROLL_RAIL_EDGE - 1, 1920)).toBe(false)
    expect(isNearRightEdge(0, 1920)).toBe(false)
  })

  it('says no when it has not been told where anything is', () => {
    expect(isNearRightEdge(Number.NaN, 1920)).toBe(false)
    expect(isNearRightEdge(1900, Number.NaN)).toBe(false)
  })
})
