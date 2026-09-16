import { describe, expect, it } from 'vitest'

import {
  REFLECTION_ASPECT_MAX,
  REFLECTION_ASPECT_MIN,
  REFLECTION_LATTICE_JITTER,
  REFLECTION_ROTATION_MAX,
  REFLECTION_SPOT_SCALE_MAX,
  REFLECTION_SPOT_SCALE_MIN,
  createReflectionLattice,
  createStableReflectionFacetSamples,
  getReflectionTravelS,
  stableReflectionValue,
} from '../components/disco/reflectionSampling'

const SHIPPED_DOMAIN_ASPECT = 3.15
const lattice = { domainAspect: SHIPPED_DOMAIN_ASPECT }

describe('stable reflection facet sampling', () => {
  it('is deterministic, unique and respects the requested budget', () => {
    const first = createStableReflectionFacetSamples(32, 64, 1024, lattice)
    const second = createStableReflectionFacetSamples(32, 64, 1024, lattice)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1024)
    expect(new Set(first.map((sample) => sample.sourceIndex)).size).toBe(first.length)
  })

  it('does not select the same count from every latitude row', () => {
    const latitudeSegments = 32
    const samples = createStableReflectionFacetSamples(latitudeSegments, 64, 1024, lattice)
    const rowCounts = Array.from({ length: latitudeSegments }, () => 0)

    samples.forEach((sample) => {
      rowCounts[sample.latitudeIndex] = (rowCounts[sample.latitudeIndex] ?? 0) + 1
    })

    const polarAverage =
      [...rowCounts.slice(0, 4), ...rowCounts.slice(-4)].reduce((sum, count) => sum + count, 0) / 8
    const equatorialAverage = rowCounts.slice(12, 20).reduce((sum, count) => sum + count, 0) / 8

    expect(new Set(rowCounts).size).toBeGreaterThan(4)
    expect(equatorialAverage).toBeGreaterThan(polarAverage)
  })

  it('gives every facet a bounded stable lane, phase and spot style', () => {
    const samples = createStableReflectionFacetSamples(32, 64, 1024, lattice)

    samples.forEach((sample) => {
      expect(sample.travelPhase).toBeGreaterThanOrEqual(0)
      expect(sample.travelPhase).toBeLessThan(1)
      expect(sample.laneProgress).toBeGreaterThanOrEqual(0)
      expect(sample.laneProgress).toBeLessThan(1)
      expect(sample.spotScale).toBeGreaterThanOrEqual(REFLECTION_SPOT_SCALE_MIN)
      expect(sample.spotScale).toBeLessThanOrEqual(REFLECTION_SPOT_SCALE_MAX)
      expect(sample.aspect).toBeGreaterThanOrEqual(REFLECTION_ASPECT_MIN)
      expect(sample.aspect).toBeLessThanOrEqual(REFLECTION_ASPECT_MAX)
      expect(Math.abs(sample.rotation)).toBeLessThanOrEqual(REFLECTION_ROTATION_MAX)
      expect(sample.styleSeed).toBeGreaterThanOrEqual(0)
      expect(sample.styleSeed).toBeLessThan(1)
    })
  })

  it('keeps the style seed independent of the colour seed', () => {
    const samples = createStableReflectionFacetSamples(32, 64, 1024, lattice)
    const matching = samples.filter((sample) => sample.styleSeed === sample.colorSeed)

    expect(matching).toHaveLength(0)
  })

  it('gives every spot its own lattice cell', () => {
    const count = 220
    const placement = createReflectionLattice(count, SHIPPED_DOMAIN_ASPECT)
    const samples = createStableReflectionFacetSamples(32, 64, count, lattice)

    const occupied = samples.map((sample) => {
      const row = Math.floor(sample.laneProgress * placement.rows)
      const offset = stableReflectionValue(row, 22) / placement.columns
      const centred = (((sample.travelPhase - offset) % 1) + 1) % 1

      return row * placement.columns + Math.floor(centred * placement.columns)
    })

    expect(placement.cellCount).toBeGreaterThanOrEqual(count)
    expect(new Set(occupied).size).toBe(count)
  })

  it('keeps neighbours apart along at least one axis', () => {
    const count = 220
    const placement = createReflectionLattice(count, SHIPPED_DOMAIN_ASPECT)
    const samples = createStableReflectionFacetSamples(32, 64, count, lattice)
    const required = 1 - REFLECTION_LATTICE_JITTER - 1e-9

    for (let a = 0; a < samples.length; a += 1) {
      for (let b = a + 1; b < samples.length; b += 1) {
        const rawPhase = Math.abs(samples[a]!.travelPhase - samples[b]!.travelPhase)
        const columnGap = Math.min(rawPhase, 1 - rawPhase) * placement.columns
        const rowGap =
          Math.abs(samples[a]!.laneProgress - samples[b]!.laneProgress) * placement.rows

        expect(Math.max(columnGap, rowGap)).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it('spreads spots wider than the independent hashing it replaced', () => {
    const count = 220
    const samples = createStableReflectionFacetSamples(32, 64, count, lattice)
    const nearest = (points: readonly { x: number; y: number }[]) => {
      let closest = Number.POSITIVE_INFINITY

      for (let a = 0; a < points.length; a += 1) {
        for (let b = a + 1; b < points.length; b += 1) {
          const rawX = Math.abs(points[a]!.x - points[b]!.x)
          const deltaX = Math.min(rawX, SHIPPED_DOMAIN_ASPECT - rawX)
          closest = Math.min(closest, Math.hypot(deltaX, points[a]!.y - points[b]!.y))
        }
      }

      return closest
    }

    const stratified = nearest(
      samples.map((sample) => ({
        x: sample.travelPhase * SHIPPED_DOMAIN_ASPECT,
        y: sample.laneProgress,
      })),
    )
    const whiteNoise = nearest(
      samples.map((sample) => ({
        x: stableReflectionValue(sample.sourceIndex, 1) * SHIPPED_DOMAIN_ASPECT,
        y: stableReflectionValue(sample.sourceIndex, 2),
      })),
    )

    expect(stratified).toBeGreaterThan(0.025)
    expect(stratified).toBeGreaterThan(whiteNoise * 3)
  })

  it('returns stable hash values in the half-open unit interval', () => {
    for (let index = 0; index < 100; index += 1) {
      const value = stableReflectionValue(index, 7)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('reflection placement lattice', () => {
  it('holds every spot and keeps its cells near square', () => {
    for (const count of [108, 220, 512]) {
      const placement = createReflectionLattice(count, SHIPPED_DOMAIN_ASPECT)
      const cellAspect = SHIPPED_DOMAIN_ASPECT / placement.columns / (1 / placement.rows)

      expect(placement.cellCount).toBeGreaterThanOrEqual(count)
      expect(cellAspect).toBeGreaterThan(0.7)
      expect(cellAspect).toBeLessThan(1.4)
    }
  })

  it('rejects a domain that has no shape', () => {
    expect(() => createReflectionLattice(220, 0)).toThrow(RangeError)
    expect(() => createReflectionLattice(220, Number.NaN)).toThrow(RangeError)
  })
})

describe('right-to-left reflection travel', () => {
  const minS = -10
  const maxS = 10
  const margin = 1

  it('moves monotonically from right to left before wrapping', () => {
    const first = getReflectionTravelS(0.1, 0, minS, maxS, margin)
    const second = getReflectionTravelS(0.1, 0.1, minS, maxS, margin)
    const third = getReflectionTravelS(0.1, 0.2, minS, maxS, margin)

    expect(second).toBeLessThan(first)
    expect(third).toBeLessThan(second)
  })

  it('reverses direction when the ball rotation reverses', () => {
    const origin = getReflectionTravelS(0.5, 0, minS, maxS, margin)
    const forward = getReflectionTravelS(0.5, 0.1, minS, maxS, margin)
    const backward = getReflectionTravelS(0.5, -0.1, minS, maxS, margin)

    expect(forward).toBeLessThan(origin)
    expect(backward).toBeGreaterThan(origin)
  })

  it('wraps between positions outside the right and left wall ends', () => {
    const justBeforeWrap = getReflectionTravelS(0, 0.999, minS, maxS, margin)
    const atWrap = getReflectionTravelS(0, 1, minS, maxS, margin)

    expect(justBeforeWrap).toBeLessThan(minS)
    expect(atWrap).toBe(maxS + margin)
  })
})
