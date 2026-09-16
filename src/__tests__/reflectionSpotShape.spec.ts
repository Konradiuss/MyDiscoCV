import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import type { ReflectionWall } from '../components/disco/reflectionGeometry'
import {
  REFLECTION_LANE_VERTICAL_INSET,
  REFLECTION_SPOT_PROFILES,
  REFLECTION_TRAVEL_MARGIN,
  buildReflectionSpotFootprint,
  getIncidenceStretch,
  getReflectionSpotWorstCaseExtent,
  getSpotPenumbra,
  getWallIncidenceCosine,
  type ReflectionIncidenceOptions,
  type ReflectionSpotFootprintTarget,
} from '../components/disco/reflectionSpotShape'

const roomCornerZ = -3.4
const roomFrontZ = 5
const roomHalfWidth = 11
const roomFloorY = -2.7
const roomCeilingY = 7.5
const roomWallSpan = Math.hypot(roomHalfWidth, roomFrontZ - roomCornerZ)

function createWalls(): readonly [ReflectionWall, ReflectionWall] {
  const cornerOrigin = new THREE.Vector3(0, 0, roomCornerZ)
  const cornerBottom = new THREE.Vector3(0, roomFloorY, roomCornerZ)
  const cornerTop = new THREE.Vector3(0, roomCeilingY, roomCornerZ)
  const leftTop = new THREE.Vector3(-roomHalfWidth, roomCeilingY, roomFrontZ)
  const rightTop = new THREE.Vector3(roomHalfWidth, roomCeilingY, roomFrontZ)
  const vertical = new THREE.Vector3(0, 1, 0)

  const createWall = (
    id: 'left' | 'right',
    frontTop: THREE.Vector3,
    unfoldedSign: -1 | 1,
  ): ReflectionWall => {
    const plane =
      id === 'left'
        ? new THREE.Plane().setFromCoplanarPoints(cornerBottom, cornerTop, frontTop)
        : new THREE.Plane().setFromCoplanarPoints(cornerBottom, frontTop, cornerTop)

    return {
      id,
      plane,
      cornerOrigin: cornerOrigin.clone(),
      horizontal: new THREE.Vector3(
        id === 'left' ? -roomHalfWidth : roomHalfWidth,
        0,
        roomFrontZ - roomCornerZ,
      ).normalize(),
      vertical: vertical.clone(),
      normal: plane.normal.clone(),
      span: roomWallSpan,
      minY: roomFloorY,
      maxY: roomCeilingY,
      unfoldedSign,
    }
  }

  return [createWall('left', leftTop, -1), createWall('right', rightTop, 1)]
}

function createTarget(): ReflectionSpotFootprintTarget {
  return [
    { s: 0, y: 0, u: 0, v: 0 },
    { s: 0, y: 0, u: 0, v: 0 },
    { s: 0, y: 0, u: 0, v: 0 },
    { s: 0, y: 0, u: 0, v: 0 },
  ]
}

const incidenceOptions: ReflectionIncidenceOptions = {
  minCosine: 0.2,
  exponent: 0.62,
  maxStretch: REFLECTION_SPOT_PROFILES.desktop.maxStretch,
}

describe('wall incidence', () => {
  const [leftWall, rightWall] = createWalls()

  it('is symmetric between the two walls', () => {
    for (let absS = 0; absS <= roomWallSpan; absS += 1.3) {
      expect(getWallIncidenceCosine(leftWall, absS, 0, 0)).toBeCloseTo(
        getWallIncidenceCosine(rightWall, absS, 0, 0),
        10,
      )
    }
  })

  it('peaks at the perpendicular foot rather than at the room corner', () => {
    const atCorner = getWallIncidenceCosine(rightWall, 0, 0, 0)
    const atFoot = getWallIncidenceCosine(rightWall, 2.0636, 0, 0)
    const atEnd = getWallIncidenceCosine(rightWall, roomWallSpan, 0, 0)

    expect(atFoot).toBeCloseTo(1, 5)
    expect(atCorner).toBeCloseTo(0.7948, 3)
    expect(atEnd).toBeCloseTo(0.2236, 3)
    expect(atCorner).toBeLessThan(atFoot)
    expect(atEnd).toBeLessThan(atCorner)
  })

  it('decreases monotonically beyond the perpendicular foot', () => {
    let previous = getWallIncidenceCosine(rightWall, 2.1, 0, 0)

    for (let absS = 2.6; absS <= roomWallSpan; absS += 0.5) {
      const current = getWallIncidenceCosine(rightWall, absS, 0, 0)
      expect(current).toBeLessThan(previous)
      previous = current
    }
  })

  it('never reports a cosine outside the unit interval', () => {
    for (let absS = 0; absS <= roomWallSpan * 2; absS += 0.7) {
      const cosine = getWallIncidenceCosine(rightWall, absS, 0, 0)
      expect(cosine).toBeGreaterThan(0)
      expect(cosine).toBeLessThanOrEqual(1)
    }
  })
})

describe('incidence stretch', () => {
  it('stays within one and the configured maximum', () => {
    for (let cosine = 0.01; cosine <= 1; cosine += 0.01) {
      const stretch = getIncidenceStretch(cosine, incidenceOptions)
      expect(stretch).toBeGreaterThanOrEqual(1)
      expect(stretch).toBeLessThanOrEqual(incidenceOptions.maxStretch)
    }
  })

  it('does not grow as the incidence becomes more direct', () => {
    let previous = getIncidenceStretch(0.05, incidenceOptions)

    for (let cosine = 0.1; cosine <= 1; cosine += 0.05) {
      const current = getIncidenceStretch(cosine, incidenceOptions)
      expect(current).toBeLessThanOrEqual(previous)
      previous = current
    }
  })

  it('leaves a head on spot unstretched', () => {
    expect(getIncidenceStretch(1, incidenceOptions)).toBe(1)
  })

  it('rejects options that would make the stretch unbounded', () => {
    expect(() => getIncidenceStretch(1, { ...incidenceOptions, minCosine: 0 })).toThrow(RangeError)
    expect(() => getIncidenceStretch(1, { ...incidenceOptions, maxStretch: 0.5 })).toThrow(
      RangeError,
    )
  })
})

describe('spot penumbra', () => {
  const penumbraOptions = { base: 0.004, perUnit: 0.0009 }

  it('grows with the throw distance', () => {
    expect(getSpotPenumbra(0, penumbraOptions)).toBeCloseTo(0.004, 10)
    expect(getSpotPenumbra(10, penumbraOptions)).toBeCloseTo(0.013, 10)
    expect(getSpotPenumbra(20, penumbraOptions)).toBeGreaterThan(
      getSpotPenumbra(10, penumbraOptions),
    )
  })

  it('never returns less than the base softness', () => {
    expect(getSpotPenumbra(-5, penumbraOptions)).toBe(penumbraOptions.base)
  })
})

describe('spot footprint', () => {
  const baseInput = {
    centerS: 3,
    centerY: 1.5,
    halfHeight: 0.07,
    aspect: 1.4,
    rotation: 0.25,
    stretch: 1,
    haloReach: 1.3,
  }

  it('writes the quad uvs the shader expects', () => {
    const target = createTarget()
    buildReflectionSpotFootprint(baseInput, target)

    expect(target.map((corner) => [corner.u, corner.v])).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])
  })

  it('stays a parallelogram under rotation and stretch', () => {
    const target = createTarget()
    buildReflectionSpotFootprint({ ...baseInput, stretch: 2.4 }, target)

    expect(target[0].s + target[2].s).toBeCloseTo(target[1].s + target[3].s, 10)
    expect(target[0].y + target[2].y).toBeCloseTo(target[1].y + target[3].y, 10)
  })

  it('is an axis aligned padded rectangle when unrotated and unstretched', () => {
    const target = createTarget()
    const extent = buildReflectionSpotFootprint({ ...baseInput, rotation: 0 }, target)

    const reachWorld = baseInput.haloReach * baseInput.halfHeight
    const paddedWidth = baseInput.halfHeight * baseInput.aspect + reachWorld
    const paddedHeight = baseInput.halfHeight + reachWorld

    expect(extent.halfExtentS).toBeCloseTo(paddedWidth, 10)
    expect(extent.halfExtentY).toBeCloseTo(paddedHeight, 10)
    expect(target[0].s).toBeCloseTo(baseInput.centerS - paddedWidth, 10)
    expect(target[0].y).toBeCloseTo(baseInput.centerY - paddedHeight, 10)
    expect(target[2].s).toBeCloseTo(baseInput.centerS + paddedWidth, 10)
    expect(target[2].y).toBeCloseTo(baseInput.centerY + paddedHeight, 10)
  })

  it('pads additively so the halo reach is equal on every quad edge', () => {
    const target = createTarget()
    const wide = { ...baseInput, aspect: 3, rotation: 0 }
    buildReflectionSpotFootprint(wide, target)

    const reachWorld = wide.haloReach * wide.halfHeight
    const horizontalPadding = target[2].s - wide.centerS - wide.halfHeight * wide.aspect
    const verticalPadding = target[2].y - wide.centerY - wide.halfHeight

    expect(horizontalPadding).toBeCloseTo(reachWorld, 10)
    expect(verticalPadding).toBeCloseTo(reachWorld, 10)
  })

  it('applies the stretch along the wall only', () => {
    const unstretched = createTarget()
    const stretched = createTarget()
    buildReflectionSpotFootprint(baseInput, unstretched)
    buildReflectionSpotFootprint({ ...baseInput, stretch: 2.5 }, stretched)

    unstretched.forEach((corner, index) => {
      const other = stretched[index]!
      expect(other.y).toBeCloseTo(corner.y, 10)
      expect(other.s - baseInput.centerS).toBeCloseTo((corner.s - baseInput.centerS) * 2.5, 10)
    })
  })
})

describe('worst case footprint invariants', () => {
  const profiles = Object.entries(REFLECTION_SPOT_PROFILES)

  it.each(profiles)('keeps the %s spot clear of the floor and ceiling', (_id, profile) => {
    const extent = getReflectionSpotWorstCaseExtent(profile.haloReach, profile.maxStretch)
    expect(extent.halfExtentY).toBeLessThan(REFLECTION_LANE_VERTICAL_INSET)
  })

  it.each(profiles)('hides the %s conveyor wrap beyond the wall ends', (_id, profile) => {
    const extent = getReflectionSpotWorstCaseExtent(profile.haloReach, profile.maxStretch)
    expect(extent.halfExtentS).toBeLessThan(REFLECTION_TRAVEL_MARGIN)
  })
})
