import { describe, expect, it } from 'vitest'

import {
  getStaticQualityTier,
  SCENE_QUALITY_PROFILES,
  type QualityReading,
} from '../components/disco/sceneQuality'
import { isNarrowViewport } from '../components/disco/viewportSync'

function reading(overrides: Partial<QualityReading> = {}): QualityReading {
  return { width: 1440, coarsePointer: false, override: null, ...overrides }
}

describe('scene quality tier', () => {
  it.each([
    ['a phone', { width: 390, coarsePointer: true }, 'low'],
    ['a narrow window on a desktop', { width: 600, coarsePointer: false }, 'low'],
    ['a tablet', { width: 1024, coarsePointer: true }, 'low'],
    ['a desktop', { width: 1440, coarsePointer: false }, 'high'],
    // A touch monitor does not make a workstation weak.
    ['a wide touchscreen', { width: 1920, coarsePointer: true }, 'high'],
  ])('reads %s as %s', (_label, input, expected) => {
    expect(getStaticQualityTier(reading(input))).toBe(expected)
  })

  it.each([
    ['low', 'low'],
    ['high', 'high'],
  ])('lets ?quality=%s overrule the reading', (override, expected) => {
    expect(getStaticQualityTier(reading({ width: 390, override }))).toBe(expected)
    expect(getStaticQualityTier(reading({ width: 1440, override }))).toBe(expected)
  })

  it('ignores an override it does not understand rather than throwing', () => {
    expect(getStaticQualityTier(reading({ override: 'ultra' }))).toBe('high')
    expect(getStaticQualityTier(reading({ width: 390, override: '' }))).toBe('low')
  })

  /*
   * The owner's condition was that a powerful machine keeps exactly the picture
   * it has today. This is that promise, written down: anyone editing the high
   * profile has to come here and say so on purpose.
   */
  it('keeps the high profile at the desktop of today', () => {
    expect(SCENE_QUALITY_PROFILES.high).toEqual({
      maxPixelRatio: 1.8,
      antialias: true,
      burstSteps: 44,
      burstMode: 'march',
      ballSegments: 32,
      reflectionDensity: 'desktop',
      silhouetteSamples: 64,
      roomGridCellPixels: 40,
      wallShading: 'standard',
      environmentLighting: true,
    })
  })
})

describe('narrow viewport', () => {
  /*
   * The component used to ask this two ways at once — `innerWidth < 720` in some
   * places, `matchMedia('(max-width: 720px)')` in others — and at exactly 720
   * they disagreed, so the ball and the light spots could be built for different
   * devices on the same screen.
   */
  it.each([
    [719, true],
    [720, false],
    [721, false],
  ])('treats %ipx as narrow: %s', (width, expected) => {
    expect(isNarrowViewport(width)).toBe(expected)
  })
})
