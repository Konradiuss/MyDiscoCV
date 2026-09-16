import { describe, expect, it } from 'vitest'

import {
  SCROLL_END_ENTER,
  SCROLL_END_LEAVE,
  getScrollEnd,
  getScrollTarget,
  type ScrollEnd,
} from '../components/controls/scrollEnds'

function page(screensFromTop: number, screens = 10) {
  const viewportHeight = 800

  return {
    scrollTop: screensFromTop * viewportHeight,
    viewportHeight,
    documentHeight: screens * viewportHeight,
  }
}

describe('which end the page is at', () => {
  it('is at the top for the first half screen and nowhere after it', () => {
    expect(getScrollEnd(page(0))).toBe('top')
    expect(getScrollEnd(page(SCROLL_END_ENTER))).toBe('top')
    expect(getScrollEnd(page(SCROLL_END_ENTER + 0.01))).toBe(null)
  })

  it('is at the bottom for the last half screen', () => {
    expect(getScrollEnd(page(9))).toBe('bottom')
    expect(getScrollEnd(page(9 - SCROLL_END_ENTER))).toBe('bottom')
    expect(getScrollEnd(page(9 - SCROLL_END_ENTER - 0.01))).toBe(null)
  })

  it('is nowhere through the whole middle', () => {
    for (let screen = 1; screen <= 8; screen += 1) {
      expect(getScrollEnd(page(screen))).toBe(null)
    }
  })
})

describe('the dead band', () => {
  it('holds the zone past the line it would not have entered at', () => {
    const justPast = page(SCROLL_END_ENTER + 0.1)

    expect(getScrollEnd(justPast, null)).toBe(null)
    expect(getScrollEnd(justPast, 'top')).toBe('top')
  })

  it('lets go once a quarter screen further on', () => {
    expect(getScrollEnd(page(SCROLL_END_LEAVE), 'top')).toBe('top')
    expect(getScrollEnd(page(SCROLL_END_LEAVE + 0.01), 'top')).toBe(null)
  })

  it('gives the bottom the same memory as the top', () => {
    expect(getScrollEnd(page(9 - SCROLL_END_LEAVE), 'bottom')).toBe('bottom')
    expect(getScrollEnd(page(9 - SCROLL_END_LEAVE - 0.01), 'bottom')).toBe(null)
  })

  it('leaves the reading where it was when both ends claim it', () => {
    const overlap = page(0.6, 2)

    expect(getScrollEnd(overlap, 'top')).toBe('top')
    expect(getScrollEnd(overlap, null)).toBe('bottom')
  })

  it('gives a dead centre tie to the end that has somewhere to go', () => {
    expect(getScrollEnd(page(0.5, 2), null)).toBe('top')
  })
})

describe('pages with nowhere to go', () => {
  it('offers nothing when the page is shorter than the window', () => {
    expect(getScrollEnd({ scrollTop: 0, viewportHeight: 800, documentHeight: 600 })).toBe(null)
  })

  it('offers nothing when the whole run is under one screen', () => {
    expect(getScrollEnd(page(0, 1.9))).toBe(null)
    expect(getScrollEnd(page(0, 2))).toBe('top')
  })

  it('keeps its answer even with a zone showing', () => {
    expect(getScrollEnd(page(0, 1.5), 'top')).toBe(null)
  })
})

describe('measurements that are not measurements', () => {
  it('reads a zero height window without dividing by it', () => {
    expect(getScrollEnd({ scrollTop: 0, viewportHeight: 0, documentHeight: 0 })).toBe(null)
  })

  it('survives numbers that are not numbers', () => {
    const answer = getScrollEnd({
      scrollTop: Number.NaN,
      viewportHeight: Number.NaN,
      documentHeight: Number.POSITIVE_INFINITY,
    })

    expect(([null, 'top', 'bottom'] as ScrollEnd[]).includes(answer)).toBe(true)
  })

  it('clamps a scroll position past either end', () => {
    expect(getScrollEnd({ ...page(0), scrollTop: -180 })).toBe('top')
    expect(getScrollEnd({ ...page(9), scrollTop: 99999 })).toBe('bottom')
  })
})

describe('where a click lands', () => {
  it('sends the page the other way from wherever it is', () => {
    expect(getScrollTarget('top', 8000)).toBe(8000)
    expect(getScrollTarget('bottom', 8000)).toBe(0)
  })

  it('asks for nothing silly when there is no reading', () => {
    expect(getScrollTarget(null, 8000)).toBe(0)
    expect(getScrollTarget('top', Number.NaN)).toBe(0)
  })
})
