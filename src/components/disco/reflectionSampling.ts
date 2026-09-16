export interface StableReflectionFacetSample {
  readonly sourceIndex: number
  readonly latitudeIndex: number
  readonly longitudeIndex: number
  readonly travelPhase: number
  readonly laneProgress: number
  readonly spotScale: number
  readonly aspect: number
  readonly rotation: number
  readonly colorSeed: number
  readonly styleSeed: number
  readonly energy: number
  readonly order: number
}

export const REFLECTION_SPOT_SCALE_MIN = 0.82
export const REFLECTION_SPOT_SCALE_RANGE = 0.46
export const REFLECTION_SPOT_SCALE_MAX = REFLECTION_SPOT_SCALE_MIN + REFLECTION_SPOT_SCALE_RANGE

export const REFLECTION_ASPECT_MIN = 1
export const REFLECTION_ASPECT_RANGE = 0.5
export const REFLECTION_ASPECT_MAX = REFLECTION_ASPECT_MIN + REFLECTION_ASPECT_RANGE

export const REFLECTION_ROTATION_MAX = 0.38

export const REFLECTION_LATTICE_JITTER = 0.75
export const REFLECTION_LATTICE_SLACK = 1.15

export interface ReflectionLattice {
  readonly columns: number
  readonly rows: number
  readonly cellCount: number
}

export interface ReflectionLatticeOptions {
  readonly domainAspect: number
  readonly jitter?: number
}

interface RankedFacet {
  readonly sourceIndex: number
  readonly latitudeIndex: number
  readonly longitudeIndex: number
  readonly selectionKey: number
}

const UINT32_RANGE = 0x1_0000_0000

export function stableReflectionValue(index: number, channel: number) {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca77)
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  value = Math.imul(value, 0x846ca68b)
  value ^= value >>> 16
  return (value >>> 0) / UINT32_RANGE
}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`)
  }
}

export function createReflectionLattice(
  sampleCount: number,
  domainAspect: number,
): ReflectionLattice {
  assertPositiveInteger(sampleCount, 'sampleCount')
  if (!Number.isFinite(domainAspect) || domainAspect <= 0) {
    throw new RangeError('domainAspect must be finite and greater than zero')
  }

  const targetCells = Math.ceil(sampleCount * REFLECTION_LATTICE_SLACK)
  const rows = Math.max(1, Math.round(Math.sqrt(targetCells / domainAspect)))
  const columns = Math.max(1, Math.ceil(targetCells / rows))

  return { columns, rows, cellCount: columns * rows }
}

function createShuffledCellOrder(cellCount: number) {
  const order = Array.from({ length: cellCount }, (_, index) => index)

  return order.sort(
    (left, right) =>
      stableReflectionValue(left, 21) - stableReflectionValue(right, 21) || left - right,
  )
}

export function createStableReflectionFacetSamples(
  latitudeSegments: number,
  longitudeSegments: number,
  requestedCount: number,
  lattice: ReflectionLatticeOptions,
): StableReflectionFacetSample[] {
  assertPositiveInteger(latitudeSegments, 'latitudeSegments')
  assertPositiveInteger(longitudeSegments, 'longitudeSegments')
  if (!Number.isFinite(requestedCount) || requestedCount < 0) {
    throw new RangeError('requestedCount must be a finite non-negative number')
  }

  const totalFacetCount = latitudeSegments * longitudeSegments
  const targetCount = Math.min(Math.floor(requestedCount), totalFacetCount)
  if (targetCount === 0) return []

  const rankedFacets: RankedFacet[] = []

  for (let sourceIndex = 0; sourceIndex < totalFacetCount; sourceIndex += 1) {
    const latitudeIndex = Math.floor(sourceIndex / longitudeSegments)
    const longitudeIndex = sourceIndex % longitudeSegments
    const latitudeCenter = ((latitudeIndex + 0.5) / latitudeSegments) * Math.PI
    const areaWeight = Math.max(0.08, Math.sin(latitudeCenter))
    const selectionNoise = Math.max(Number.EPSILON, stableReflectionValue(sourceIndex, 11))

    rankedFacets.push({
      sourceIndex,
      latitudeIndex,
      longitudeIndex,
      selectionKey: -Math.log(selectionNoise) / areaWeight,
    })
  }

  rankedFacets.sort(
    (left, right) => left.selectionKey - right.selectionKey || left.sourceIndex - right.sourceIndex,
  )

  const placement = createReflectionLattice(targetCount, lattice.domainAspect)
  const cellOrder = createShuffledCellOrder(placement.cellCount)
  const jitter = Math.min(Math.max(lattice.jitter ?? REFLECTION_LATTICE_JITTER, 0), 1)

  const samples = rankedFacets
    .slice(0, targetCount)
    .map((facet, sampleIndex): StableReflectionFacetSample => {
      const { sourceIndex } = facet
      const colorSeed = stableReflectionValue(sourceIndex, 6)

      const cell = cellOrder[sampleIndex]!
      const column = cell % placement.columns
      const row = (cell - column) / placement.columns
      const rowPhase = stableReflectionValue(row, 22)

      return {
        sourceIndex,
        latitudeIndex: facet.latitudeIndex,
        longitudeIndex: facet.longitudeIndex,
        travelPhase: wrapUnit(
          (column + 0.5 + (stableReflectionValue(sourceIndex, 1) - 0.5) * jitter + rowPhase) /
            placement.columns,
        ),
        laneProgress:
          (row + 0.5 + (stableReflectionValue(sourceIndex, 2) - 0.5) * jitter) / placement.rows,
        spotScale:
          REFLECTION_SPOT_SCALE_MIN +
          stableReflectionValue(sourceIndex, 3) * REFLECTION_SPOT_SCALE_RANGE,
        aspect:
          REFLECTION_ASPECT_MIN + stableReflectionValue(sourceIndex, 4) * REFLECTION_ASPECT_RANGE,
        rotation: (stableReflectionValue(sourceIndex, 5) * 2 - 1) * REFLECTION_ROTATION_MAX,
        colorSeed,
        styleSeed: stableReflectionValue(sourceIndex, 12),
        energy: 0.78 + stableReflectionValue(sourceIndex, 7) * 0.38,
        order: stableReflectionValue(sourceIndex, 8),
      }
    })

  return samples.sort(
    (left, right) => left.order - right.order || left.sourceIndex - right.sourceIndex,
  )
}

function wrapUnit(value: number) {
  return ((value % 1) + 1) % 1
}

export function getReflectionTravelS(
  basePhase: number,
  travelTurns: number,
  minS: number,
  maxS: number,
  offscreenMargin: number,
) {
  if (!(maxS > minS)) throw new RangeError('maxS must be greater than minS')
  if (!Number.isFinite(offscreenMargin) || offscreenMargin < 0) {
    throw new RangeError('offscreenMargin must be finite and non-negative')
  }

  const progress = wrapUnit(basePhase + travelTurns)
  return maxS + offscreenMargin - progress * (maxS - minS + offscreenMargin * 2)
}
