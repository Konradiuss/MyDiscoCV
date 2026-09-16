import * as THREE from 'three'

export type ReflectionWallId = 'left' | 'right'

export interface ReflectionWall {
  readonly id: ReflectionWallId
  readonly plane: THREE.Plane
  readonly cornerOrigin: THREE.Vector3
  readonly horizontal: THREE.Vector3
  readonly vertical: THREE.Vector3
  readonly normal: THREE.Vector3
  readonly span: number
  readonly minY: number
  readonly maxY: number
  readonly unfoldedSign: -1 | 1
}

export interface UnfoldedPoint {
  readonly s: number
  readonly y: number
}

export interface ReflectionPolygonVertex extends UnfoldedPoint {
  readonly u: number
  readonly v: number
}

export interface ReflectionRayHit {
  readonly wall: ReflectionWall
  readonly point: THREE.Vector3
  readonly unfolded: UnfoldedPoint
  readonly distance: number
}

export interface MutableReflectionRayHit {
  wall: ReflectionWall | null
  readonly point: THREE.Vector3
  unfoldedS: number
  unfoldedY: number
  distance: number
}

export interface RayIntersectionOptions {
  readonly clipToSpan?: boolean
  readonly clipToHeight?: boolean
  readonly epsilon?: number
}

export interface UnfoldedBounds {
  readonly minS: number
  readonly maxS: number
  readonly minY: number
  readonly maxY: number
}

export interface SplitReflectionPolygon {
  readonly left: ReflectionPolygonVertex[]
  readonly right: ReflectionPolygonVertex[]
}

export interface MutableReflectionPolygonVertex {
  s: number
  y: number
  u: number
  v: number
}

export interface ReflectionPolygonClipWorkspace {
  readonly bufferA: MutableReflectionPolygonVertex[]
  readonly bufferB: MutableReflectionPolygonVertex[]
  readonly left: MutableReflectionPolygonVertex[]
  readonly right: MutableReflectionPolygonVertex[]
  leftCount: number
  rightCount: number
}

const DEFAULT_EPSILON = 1e-6

function horizontalDistance(point: THREE.Vector3, wall: ReflectionWall) {
  const x = point.x - wall.cornerOrigin.x
  const y = point.y - wall.cornerOrigin.y
  const z = point.z - wall.cornerOrigin.z

  return x * wall.horizontal.x + y * wall.horizontal.y + z * wall.horizontal.z
}

function copyVertex(vertex: ReflectionPolygonVertex): ReflectionPolygonVertex {
  return { s: vertex.s, y: vertex.y, u: vertex.u, v: vertex.v }
}

function interpolateVertex(
  start: ReflectionPolygonVertex,
  end: ReflectionPolygonVertex,
  progress: number,
): ReflectionPolygonVertex {
  return {
    s: THREE.MathUtils.lerp(start.s, end.s, progress),
    y: THREE.MathUtils.lerp(start.y, end.y, progress),
    u: THREE.MathUtils.lerp(start.u, end.u, progress),
    v: THREE.MathUtils.lerp(start.v, end.v, progress),
  }
}

function polygonArea(polygon: readonly ReflectionPolygonVertex[]) {
  let twiceArea = 0

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!
    const next = polygon[(index + 1) % polygon.length]!
    twiceArea += current.s * next.y - next.s * current.y
  }

  return twiceArea * 0.5
}

function removeDegeneratePolygon(
  polygon: readonly ReflectionPolygonVertex[],
  epsilon: number,
): ReflectionPolygonVertex[] {
  const uniqueVertices: ReflectionPolygonVertex[] = []

  polygon.forEach((vertex) => {
    const previous = uniqueVertices[uniqueVertices.length - 1]
    if (
      !previous ||
      Math.abs(previous.s - vertex.s) > epsilon ||
      Math.abs(previous.y - vertex.y) > epsilon
    ) {
      uniqueVertices.push(copyVertex(vertex))
    }
  })

  if (uniqueVertices.length > 1) {
    const first = uniqueVertices[0]!
    const last = uniqueVertices[uniqueVertices.length - 1]!
    if (Math.abs(first.s - last.s) <= epsilon && Math.abs(first.y - last.y) <= epsilon) {
      uniqueVertices.pop()
    }
  }

  if (uniqueVertices.length < 3 || Math.abs(polygonArea(uniqueVertices)) <= epsilon * epsilon) {
    return []
  }

  return uniqueVertices
}

function rayDistanceToWall(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  wall: ReflectionWall,
  options?: RayIntersectionOptions,
) {
  const epsilon = options?.epsilon ?? DEFAULT_EPSILON
  const denominator = wall.plane.normal.dot(direction)

  if (Math.abs(denominator) <= epsilon) return null

  const distance = -(wall.plane.normal.dot(origin) + wall.plane.constant) / denominator
  if (distance <= epsilon) return null

  const pointX = origin.x + direction.x * distance
  const pointY = origin.y + direction.y * distance
  const pointZ = origin.z + direction.z * distance
  const wallDistance =
    (pointX - wall.cornerOrigin.x) * wall.horizontal.x +
    (pointY - wall.cornerOrigin.y) * wall.horizontal.y +
    (pointZ - wall.cornerOrigin.z) * wall.horizontal.z

  if (wallDistance < -epsilon) return null
  if ((options?.clipToSpan ?? true) && wallDistance > wall.span + epsilon) return null
  if (
    (options?.clipToHeight ?? true) &&
    (pointY < wall.minY - epsilon || pointY > wall.maxY + epsilon)
  ) {
    return null
  }

  return distance
}

export function intersectRayWithWall(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  wall: ReflectionWall,
  options: RayIntersectionOptions = {},
): ReflectionRayHit | null {
  const distance = rayDistanceToWall(origin, direction, wall, options)
  if (distance === null) return null

  const point = direction.clone().multiplyScalar(distance).add(origin)

  return {
    wall,
    point,
    unfolded: worldToUnfolded(point, wall),
    distance,
  }
}

export function intersectRayWithWalls(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  walls: readonly ReflectionWall[],
  options: RayIntersectionOptions = {},
): ReflectionRayHit | null {
  let closestHit: ReflectionRayHit | null = null

  walls.forEach((wall) => {
    const hit = intersectRayWithWall(origin, direction, wall, options)
    if (hit && (!closestHit || hit.distance < closestHit.distance)) closestHit = hit
  })

  return closestHit
}

export function intersectRayWithWallsInto(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  walls: readonly ReflectionWall[],
  target: MutableReflectionRayHit,
  options?: RayIntersectionOptions,
) {
  let closestWall: ReflectionWall | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < walls.length; index += 1) {
    const wall = walls[index]!
    const distance = rayDistanceToWall(origin, direction, wall, options)
    if (distance !== null && distance < closestDistance) {
      closestWall = wall
      closestDistance = distance
    }
  }

  target.wall = closestWall
  target.distance = closestDistance
  if (!closestWall) return false

  target.point.copy(direction).multiplyScalar(closestDistance).add(origin)
  target.unfoldedS = horizontalDistance(target.point, closestWall) * closestWall.unfoldedSign
  target.unfoldedY = target.point.y
  return true
}

export function worldToUnfolded(point: THREE.Vector3, wall: ReflectionWall): UnfoldedPoint {
  return {
    s: horizontalDistance(point, wall) * wall.unfoldedSign,
    y: point.y,
  }
}

export function unfoldedToWorld(
  point: UnfoldedPoint,
  wall: ReflectionWall,
  target = new THREE.Vector3(),
) {
  const horizontalDistanceFromCorner = Math.abs(point.s)

  return target
    .copy(wall.cornerOrigin)
    .addScaledVector(wall.horizontal, horizontalDistanceFromCorner)
    .addScaledVector(wall.vertical, point.y - wall.cornerOrigin.y)
}

export function clipConvexPolygon(
  polygon: readonly ReflectionPolygonVertex[],
  signedDistance: (vertex: ReflectionPolygonVertex) => number,
  epsilon = DEFAULT_EPSILON,
): ReflectionPolygonVertex[] {
  if (polygon.length < 3) return []

  const clipped: ReflectionPolygonVertex[] = []
  let previous = polygon[polygon.length - 1]!
  let previousDistance = signedDistance(previous)
  let previousInside = previousDistance >= -epsilon

  polygon.forEach((current) => {
    const currentDistance = signedDistance(current)
    const currentInside = currentDistance >= -epsilon

    if (currentInside !== previousInside) {
      const divisor = previousDistance - currentDistance
      const progress = Math.abs(divisor) <= epsilon ? 0 : previousDistance / divisor
      clipped.push(interpolateVertex(previous, current, THREE.MathUtils.clamp(progress, 0, 1)))
    }

    if (currentInside) clipped.push(copyVertex(current))

    previous = current
    previousDistance = currentDistance
    previousInside = currentInside
  })

  return removeDegeneratePolygon(clipped, epsilon)
}

export function clipPolygonToUnfoldedBounds(
  polygon: readonly ReflectionPolygonVertex[],
  bounds: UnfoldedBounds,
  epsilon = DEFAULT_EPSILON,
): ReflectionPolygonVertex[] {
  let result = polygon.map(copyVertex)

  result = clipConvexPolygon(result, (vertex) => vertex.s - bounds.minS, epsilon)
  result = clipConvexPolygon(result, (vertex) => bounds.maxS - vertex.s, epsilon)
  result = clipConvexPolygon(result, (vertex) => vertex.y - bounds.minY, epsilon)
  result = clipConvexPolygon(result, (vertex) => bounds.maxY - vertex.y, epsilon)

  return result
}

export function splitPolygonAtCorner(
  polygon: readonly ReflectionPolygonVertex[],
  epsilon = DEFAULT_EPSILON,
): SplitReflectionPolygon {
  return {
    left: clipConvexPolygon(polygon, (vertex) => -vertex.s, epsilon),
    right: clipConvexPolygon(polygon, (vertex) => vertex.s, epsilon),
  }
}

export function clipAndSplitReflectionPolygon(
  polygon: readonly ReflectionPolygonVertex[],
  bounds: UnfoldedBounds,
  epsilon = DEFAULT_EPSILON,
): SplitReflectionPolygon {
  return splitPolygonAtCorner(clipPolygonToUnfoldedBounds(polygon, bounds, epsilon), epsilon)
}
const CLIP_MIN_S = 0
const CLIP_MAX_S = 1
const CLIP_MIN_Y = 2
const CLIP_MAX_Y = 3

function createMutablePolygonBuffer(capacity: number) {
  return Array.from({ length: capacity }, () => ({ s: 0, y: 0, u: 0, v: 0 }))
}

export function createReflectionPolygonClipWorkspace(
  capacity = 16,
): ReflectionPolygonClipWorkspace {
  if (capacity < 4)
    throw new RangeError('Reflection clipping workspace must hold at least 4 vertices')

  return {
    bufferA: createMutablePolygonBuffer(capacity),
    bufferB: createMutablePolygonBuffer(capacity),
    left: createMutablePolygonBuffer(capacity),
    right: createMutablePolygonBuffer(capacity),
    leftCount: 0,
    rightCount: 0,
  }
}

function mutableBoundaryDistance(
  vertex: MutableReflectionPolygonVertex,
  boundary: number,
  limit: number,
) {
  if (boundary === CLIP_MIN_S) return vertex.s - limit
  if (boundary === CLIP_MAX_S) return limit - vertex.s
  if (boundary === CLIP_MIN_Y) return vertex.y - limit
  return limit - vertex.y
}

function copyMutableVertex(
  target: MutableReflectionPolygonVertex,
  source: ReflectionPolygonVertex,
) {
  target.s = source.s
  target.y = source.y
  target.u = source.u
  target.v = source.v
}

function normalizeMutablePolygon(
  vertices: MutableReflectionPolygonVertex[],
  count: number,
  epsilon: number,
) {
  let uniqueCount = 0

  for (let index = 0; index < count; index += 1) {
    const vertex = vertices[index]!
    const previous = uniqueCount > 0 ? vertices[uniqueCount - 1]! : null
    if (
      previous &&
      Math.abs(previous.s - vertex.s) <= epsilon &&
      Math.abs(previous.y - vertex.y) <= epsilon
    ) {
      continue
    }

    if (uniqueCount !== index) copyMutableVertex(vertices[uniqueCount]!, vertex)
    uniqueCount += 1
  }

  if (uniqueCount > 1) {
    const first = vertices[0]!
    const last = vertices[uniqueCount - 1]!
    if (Math.abs(first.s - last.s) <= epsilon && Math.abs(first.y - last.y) <= epsilon) {
      uniqueCount -= 1
    }
  }

  if (uniqueCount < 3) return 0

  let twiceArea = 0
  for (let index = 0; index < uniqueCount; index += 1) {
    const current = vertices[index]!
    const next = vertices[(index + 1) % uniqueCount]!
    twiceArea += current.s * next.y - next.s * current.y
  }

  return Math.abs(twiceArea) <= epsilon * epsilon * 2 ? 0 : uniqueCount
}

function clipMutablePolygon(
  source: MutableReflectionPolygonVertex[],
  sourceCount: number,
  target: MutableReflectionPolygonVertex[],
  boundary: number,
  limit: number,
  epsilon: number,
) {
  if (sourceCount < 3) return 0

  let targetCount = 0
  let previous = source[sourceCount - 1]!
  let previousDistance = mutableBoundaryDistance(previous, boundary, limit)
  let previousInside = previousDistance >= -epsilon

  for (let index = 0; index < sourceCount; index += 1) {
    const current = source[index]!
    const currentDistance = mutableBoundaryDistance(current, boundary, limit)
    const currentInside = currentDistance >= -epsilon

    if (currentInside !== previousInside) {
      if (targetCount >= target.length)
        throw new RangeError('Reflection clipping workspace overflow')
      const divisor = previousDistance - currentDistance
      const progress = THREE.MathUtils.clamp(
        Math.abs(divisor) <= epsilon ? 0 : previousDistance / divisor,
        0,
        1,
      )
      const intersection = target[targetCount]!
      intersection.s = THREE.MathUtils.lerp(previous.s, current.s, progress)
      intersection.y = THREE.MathUtils.lerp(previous.y, current.y, progress)
      intersection.u = THREE.MathUtils.lerp(previous.u, current.u, progress)
      intersection.v = THREE.MathUtils.lerp(previous.v, current.v, progress)
      if (boundary === CLIP_MIN_S || boundary === CLIP_MAX_S) intersection.s = limit
      else intersection.y = limit
      targetCount += 1
    }

    if (currentInside) {
      if (targetCount >= target.length)
        throw new RangeError('Reflection clipping workspace overflow')
      copyMutableVertex(target[targetCount]!, current)
      targetCount += 1
    }

    previous = current
    previousDistance = currentDistance
    previousInside = currentInside
  }

  return normalizeMutablePolygon(target, targetCount, epsilon)
}

export function clipAndSplitReflectionPolygonInto(
  polygon: readonly ReflectionPolygonVertex[],
  bounds: UnfoldedBounds,
  workspace: ReflectionPolygonClipWorkspace,
  epsilon = DEFAULT_EPSILON,
) {
  workspace.leftCount = 0
  workspace.rightCount = 0
  if (polygon.length < 3) return false
  if (polygon.length > workspace.bufferA.length) {
    throw new RangeError('Reflection clipping workspace cannot hold the source polygon')
  }

  for (let index = 0; index < polygon.length; index += 1) {
    copyMutableVertex(workspace.bufferA[index]!, polygon[index]!)
  }

  let source = workspace.bufferA
  let target = workspace.bufferB
  let count = normalizeMutablePolygon(source, polygon.length, epsilon)

  count = clipMutablePolygon(source, count, target, CLIP_MIN_S, bounds.minS, epsilon)
  let swap = source
  source = target
  target = swap
  count = clipMutablePolygon(source, count, target, CLIP_MAX_S, bounds.maxS, epsilon)
  swap = source
  source = target
  target = swap
  count = clipMutablePolygon(source, count, target, CLIP_MIN_Y, bounds.minY, epsilon)
  swap = source
  source = target
  target = swap
  count = clipMutablePolygon(source, count, target, CLIP_MAX_Y, bounds.maxY, epsilon)
  swap = source
  source = target

  if (count === 0) return false

  workspace.leftCount = clipMutablePolygon(source, count, workspace.left, CLIP_MAX_S, 0, epsilon)
  workspace.rightCount = clipMutablePolygon(source, count, workspace.right, CLIP_MIN_S, 0, epsilon)

  return workspace.leftCount > 0 || workspace.rightCount > 0
}
