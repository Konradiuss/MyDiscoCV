import {
  REFLECTION_ASPECT_MAX,
  REFLECTION_ROTATION_MAX,
  REFLECTION_SPOT_SCALE_MAX,
} from './reflectionSampling'
import type { MutableReflectionPolygonVertex, ReflectionWall } from './reflectionGeometry'

export const REFLECTION_SPOT_HALF_HEIGHT = 0.05
export const REFLECTION_LANE_VERTICAL_INSET = 0.42
export const REFLECTION_TRAVEL_MARGIN = 0.9

export const REFLECTION_SPOT_PROFILES = {
  desktop: { haloReach: 1.3, maxStretch: 2.6, lowQuality: false },
  mobile: { haloReach: 1, maxStretch: 2.1, lowQuality: true },
} as const

export interface ReflectionIncidenceOptions {
  readonly minCosine: number
  readonly exponent: number
  readonly maxStretch: number
}

export interface ReflectionPenumbraOptions {
  readonly base: number
  readonly perUnit: number
}

export interface ReflectionSpotFootprintInput {
  readonly centerS: number
  readonly centerY: number
  readonly halfHeight: number
  readonly aspect: number
  readonly rotation: number
  readonly stretch: number
  readonly haloReach: number
}

export interface ReflectionSpotFootprintExtent {
  readonly halfExtentS: number
  readonly halfExtentY: number
}

export type ReflectionSpotFootprintTarget = readonly [
  MutableReflectionPolygonVertex,
  MutableReflectionPolygonVertex,
  MutableReflectionPolygonVertex,
  MutableReflectionPolygonVertex,
]

const INCIDENCE_EPSILON = 1e-6

export function getWallIncidenceCosine(
  wall: ReflectionWall,
  absS: number,
  sourceX: number,
  sourceZ: number,
) {
  const offsetX = wall.cornerOrigin.x + wall.horizontal.x * absS - sourceX
  const offsetZ = wall.cornerOrigin.z + wall.horizontal.z * absS - sourceZ
  const throwLength = Math.hypot(offsetX, offsetZ)
  if (throwLength <= INCIDENCE_EPSILON) return 1

  const cosine = Math.abs((offsetX * wall.normal.x + offsetZ * wall.normal.z) / throwLength)
  return Math.min(1, cosine)
}

export function getIncidenceStretch(cosine: number, options: ReflectionIncidenceOptions) {
  if (!(options.minCosine > 0)) throw new RangeError('minCosine must be greater than zero')
  if (!(options.maxStretch >= 1)) throw new RangeError('maxStretch must be at least 1')

  const shaped = Math.pow(1 / Math.max(cosine, options.minCosine), options.exponent)
  return Math.min(Math.max(shaped, 1), options.maxStretch)
}

export function getSpotPenumbra(throwDistance: number, options: ReflectionPenumbraOptions) {
  return options.base + Math.max(0, throwDistance) * options.perUnit
}

export function buildReflectionSpotFootprint(
  input: ReflectionSpotFootprintInput,
  target: ReflectionSpotFootprintTarget,
): ReflectionSpotFootprintExtent {
  const reachWorld = input.haloReach * input.halfHeight
  const paddedWidth = input.halfHeight * input.aspect + reachWorld
  const paddedHeight = input.halfHeight + reachWorld
  const rotationCosine = Math.cos(input.rotation)
  const rotationSine = Math.sin(input.rotation)

  const widthS = rotationCosine * paddedWidth * input.stretch
  const widthY = rotationSine * paddedWidth
  const heightS = -rotationSine * paddedHeight * input.stretch
  const heightY = rotationCosine * paddedHeight

  const bottomLeft = target[0]
  const bottomRight = target[1]
  const topRight = target[2]
  const topLeft = target[3]

  bottomLeft.s = input.centerS - widthS - heightS
  bottomLeft.y = input.centerY - widthY - heightY
  bottomLeft.u = 0
  bottomLeft.v = 0
  bottomRight.s = input.centerS + widthS - heightS
  bottomRight.y = input.centerY + widthY - heightY
  bottomRight.u = 1
  bottomRight.v = 0
  topRight.s = input.centerS + widthS + heightS
  topRight.y = input.centerY + widthY + heightY
  topRight.u = 1
  topRight.v = 1
  topLeft.s = input.centerS - widthS + heightS
  topLeft.y = input.centerY - widthY + heightY
  topLeft.u = 0
  topLeft.v = 1

  return {
    halfExtentS: Math.abs(widthS) + Math.abs(heightS),
    halfExtentY: Math.abs(widthY) + Math.abs(heightY),
  }
}

function createFootprintTarget(): ReflectionSpotFootprintTarget {
  return [
    { s: 0, y: 0, u: 0, v: 0 },
    { s: 0, y: 0, u: 0, v: 0 },
    { s: 0, y: 0, u: 0, v: 0 },
    { s: 0, y: 0, u: 0, v: 0 },
  ]
}

export function getReflectionSpotWorstCaseExtent(
  haloReach: number,
  maxStretch: number,
  halfHeight = REFLECTION_SPOT_HALF_HEIGHT,
): ReflectionSpotFootprintExtent {
  return buildReflectionSpotFootprint(
    {
      centerS: 0,
      centerY: 0,
      halfHeight: halfHeight * REFLECTION_SPOT_SCALE_MAX,
      aspect: REFLECTION_ASPECT_MAX,
      rotation: REFLECTION_ROTATION_MAX,
      stretch: maxStretch,
      haloReach,
    },
    createFootprintTarget(),
  )
}
