export interface GridVector {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface RoomGridPlane {
  readonly origin: GridVector
  readonly right: GridVector
  readonly up: GridVector
  readonly width: number
  readonly height: number
}

export interface RoomGridHalfSpace {
  readonly normal: GridVector
  readonly constant: number
}

export interface RoomGridSpacing {
  readonly acrossWidth: number
  readonly acrossHeight: number
}

function resolveSpacing(spacing: number | RoomGridSpacing): RoomGridSpacing {
  return typeof spacing === 'number' ? { acrossWidth: spacing, acrossHeight: spacing } : spacing
}

const CLIP_EPSILON = 1e-9

function assertPositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and greater than zero`)
  }
}

export function getRoomGridCellSize(
  pixelSize: number,
  verticalFovDegrees: number,
  viewportHeight: number,
  referenceDistance: number,
) {
  assertPositive(pixelSize, 'pixelSize')
  assertPositive(viewportHeight, 'viewportHeight')
  assertPositive(referenceDistance, 'referenceDistance')
  if (
    !Number.isFinite(verticalFovDegrees) ||
    verticalFovDegrees <= 0 ||
    verticalFovDegrees >= 180
  ) {
    throw new RangeError('verticalFovDegrees must be within (0, 180)')
  }

  const visibleHeight = 2 * referenceDistance * Math.tan((verticalFovDegrees * Math.PI) / 360)

  return (pixelSize * visibleHeight) / viewportHeight
}

function clipSegmentParameters(
  startDistances: readonly number[],
  endDistances: readonly number[],
): { start: number; end: number } | null {
  let start = 0
  let end = 1

  for (let index = 0; index < startDistances.length; index += 1) {
    const from = startDistances[index]!
    const to = endDistances[index]!
    const delta = to - from

    if (Math.abs(delta) <= CLIP_EPSILON) {
      if (from < 0) return null
      continue
    }

    const crossing = -from / delta
    if (delta > 0) start = Math.max(start, crossing)
    else end = Math.min(end, crossing)

    if (start >= end) return null
  }

  return { start, end }
}

export function buildRoomGridPositions(
  plane: RoomGridPlane,
  spacing: number | RoomGridSpacing,
  halfSpaces: readonly RoomGridHalfSpace[] = [],
): Float32Array {
  const { acrossWidth, acrossHeight } = resolveSpacing(spacing)
  assertPositive(acrossWidth, 'spacing.acrossWidth')
  assertPositive(acrossHeight, 'spacing.acrossHeight')
  assertPositive(plane.width, 'plane.width')
  assertPositive(plane.height, 'plane.height')

  const positions: number[] = []
  const startDistances: number[] = []
  const endDistances: number[] = []

  const pointAt = (alongWidth: number, alongHeight: number, axis: 'x' | 'y' | 'z') =>
    plane.origin[axis] + plane.right[axis] * alongWidth + plane.up[axis] * alongHeight

  const addSegment = (
    startWidth: number,
    startHeight: number,
    endWidth: number,
    endHeight: number,
  ) => {
    const startX = pointAt(startWidth, startHeight, 'x')
    const startY = pointAt(startWidth, startHeight, 'y')
    const startZ = pointAt(startWidth, startHeight, 'z')
    const endX = pointAt(endWidth, endHeight, 'x')
    const endY = pointAt(endWidth, endHeight, 'y')
    const endZ = pointAt(endWidth, endHeight, 'z')

    let from = 0
    let to = 1

    if (halfSpaces.length > 0) {
      startDistances.length = 0
      endDistances.length = 0

      halfSpaces.forEach((halfSpace) => {
        const { normal } = halfSpace
        startDistances.push(
          normal.x * startX + normal.y * startY + normal.z * startZ + halfSpace.constant,
        )
        endDistances.push(normal.x * endX + normal.y * endY + normal.z * endZ + halfSpace.constant)
      })

      const clipped = clipSegmentParameters(startDistances, endDistances)
      if (!clipped) return
      from = clipped.start
      to = clipped.end
    }

    positions.push(
      startX + (endX - startX) * from,
      startY + (endY - startY) * from,
      startZ + (endZ - startZ) * from,
      startX + (endX - startX) * to,
      startY + (endY - startY) * to,
      startZ + (endZ - startZ) * to,
    )
  }

  const columns = Math.floor(plane.width / acrossWidth)
  const rows = Math.floor(plane.height / acrossHeight)

  for (let column = 0; column <= columns; column += 1) {
    const offset = column * acrossWidth
    addSegment(offset, 0, offset, plane.height)
  }

  for (let row = 0; row <= rows; row += 1) {
    const offset = row * acrossHeight
    addSegment(0, offset, plane.width, offset)
  }

  return Float32Array.from(positions)
}
