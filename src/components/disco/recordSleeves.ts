import * as THREE from 'three'
import type { ScreenRect } from './ballProjection'
import { stableReflectionValue } from './reflectionSampling'

export const RECORD_SLEEVE_SIZE = 0.9
export const RECORD_SLEEVE_ROTATION_MAX = 0.5

export const RECORD_VINYL_DIAMETER = 0.95
export const RECORD_LABEL_DIAMETER = 0.33
export const RECORD_SLIDE_SHARE = 0.75

export function getRecordSlideOffset(size = RECORD_SLEEVE_SIZE) {
  const radius = (size * RECORD_VINYL_DIAMETER) / 2
  return size / 2 + radius * (RECORD_SLIDE_SHARE * 2 - 1)
}

export function getRecordSleeveSeparation(size = RECORD_SLEEVE_SIZE) {
  return size * Math.SQRT2
}

export interface AreaEdge {
  readonly near: number
  readonly far: number
}

export interface RecordSleeveArea {
  readonly minX: number
  readonly frameMaxX: AreaEdge
  readonly wallMaxX: AreaEdge
  readonly minZ: number
  readonly maxZ: number
}

export interface RecordSleevePlacement {
  readonly x: number
  readonly z: number
  readonly rotation: number
}

function footprintOf(rotation: number, size: number) {
  return size * (Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation)))
}

function halfFootprint(size: number) {
  return footprintOf(RECORD_SLEEVE_ROTATION_MAX, size) / 2
}

export function getAreaMaxX(area: RecordSleeveArea, z: number) {
  const depth = area.maxZ - area.minZ
  if (!(depth > 0)) return Math.min(area.frameMaxX.near, area.wallMaxX.near)

  const towardTheBack = Math.min(1, Math.max(0, (area.maxZ - z) / depth))
  const readEdge = (edge: AreaEdge) => edge.near + (edge.far - edge.near) * towardTheBack

  return Math.min(readEdge(area.frameMaxX), readEdge(area.wallMaxX))
}

export function getRecordSleeveSize(
  count: number,
  area: RecordSleeveArea,
  desired = RECORD_SLEEVE_SIZE,
) {
  if (!Number.isInteger(count) || count <= 0) return 0

  const depth = area.maxZ - area.minZ
  if (!(depth > 0) || !(desired > 0)) return 0

  const footprint = footprintOf(RECORD_SLEEVE_ROTATION_MAX, 1)
  const byDepth = depth / (footprint + Math.SQRT2 * (count - 1))

  const narrowest = Math.min(getAreaMaxX(area, area.maxZ), getAreaMaxX(area, area.minZ)) - area.minX
  const byWidth = Math.max(0, narrowest) / footprint

  return Math.min(desired, byDepth, byWidth)
}

function shuffledColumns(count: number) {
  const columns = Array.from({ length: count }, (_unused, index) => index)

  for (let index = count - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(stableReflectionValue(index, 34) * (index + 1))
    const held = columns[index]!
    columns[index] = columns[swapIndex]!
    columns[swapIndex] = held
  }

  return columns
}

export function getRecordSleeveLayout(
  count: number,
  area: RecordSleeveArea,
  size = RECORD_SLEEVE_SIZE,
): RecordSleevePlacement[] {
  if (!Number.isInteger(count) || count <= 0 || !(size > 0)) return []

  const depth = area.maxZ - area.minZ
  if (!(depth > 0)) return []
  if (getAreaMaxX(area, area.maxZ) <= area.minX || getAreaMaxX(area, area.minZ) <= area.minX) {
    return []
  }

  const half = halfFootprint(size)
  const nearZ = area.maxZ - half
  const farZ = area.minZ + half
  if (farZ > nearZ) return []

  const minX = area.minX + half

  const step = count > 1 ? (nearZ - farZ) / (count - 1) : 0
  const slack = Math.max(0, step - getRecordSleeveSeparation(size)) / 2
  const columns = shuffledColumns(count)

  const depths = Array.from({ length: count }, (_unused, index) => {
    const drift = (stableReflectionValue(index, 32) - 0.5) * 2 * slack
    return Math.min(nearZ, Math.max(farZ, nearZ - step * index + drift))
  })

  const limits = depths.map(
    (z) => Math.min(getAreaMaxX(area, z - half), getAreaMaxX(area, z + half)) - half,
  )
  const reach = Math.max(...limits)

  return Array.from({ length: count }, (_unused, index) => {
    const column = columns[index] ?? index
    const lane = (column + 0.5 + (stableReflectionValue(index, 33) - 0.5) * 0.5) / count
    const maxX = limits[index]!

    return {
      x: Math.min(maxX, Math.max(minX, minX + lane * (reach - minX))),
      z: depths[index]!,
      rotation: (stableReflectionValue(index, 31) * 2 - 1) * RECORD_SLEEVE_ROTATION_MAX,
    }
  })
}

function distanceToSleeve(x: number, z: number, sleeve: RecordSleevePlacement, size: number) {
  const cos = Math.cos(sleeve.rotation)
  const sin = Math.sin(sleeve.rotation)
  const fromX = x - sleeve.x
  const fromZ = z - sleeve.z

  const localX = fromX * cos - fromZ * sin
  const localZ = fromX * sin + fromZ * cos
  const half = size / 2

  return Math.hypot(Math.max(Math.abs(localX) - half, 0), Math.max(Math.abs(localZ) - half, 0))
}

export interface RecordSlide {
  readonly x: number
  readonly z: number
  readonly distance: number
}

const SLIDE_CANDIDATES: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function getRecordSlide(
  index: number,
  placements: readonly RecordSleevePlacement[],
  area: RecordSleeveArea,
  size = RECORD_SLEEVE_SIZE,
): RecordSlide {
  const ideal = getRecordSlideOffset(size)
  const sleeve = placements[index]
  if (!sleeve) return { x: -1, z: 0, distance: 0 }

  const radius = (size * RECORD_VINYL_DIAMETER) / 2
  const cos = Math.cos(sleeve.rotation)
  const sin = Math.sin(sleeve.rotation)

  const worldOf = (localX: number, localZ: number, travel: number) => ({
    x: sleeve.x + travel * (localX * cos + localZ * sin),
    z: sleeve.z + travel * (-localX * sin + localZ * cos),
  })

  const patchRoom = (at: { x: number; z: number }) =>
    Math.min(at.x - area.minX, getAreaMaxX(area, at.z) - at.x, area.maxZ - at.z, at.z - area.minZ) -
    radius

  const roomFor = (localX: number, localZ: number) => {
    const at = worldOf(localX, localZ, ideal)
    let room = patchRoom(at)

    placements.forEach((other, otherIndex) => {
      if (otherIndex === index) return

      room = Math.min(room, distanceToSleeve(at.x, at.z, other, size) - radius)
    })

    return room
  }

  const scored = SLIDE_CANDIDATES.map((candidate) => ({
    candidate,
    room: roomFor(candidate[0], candidate[1]),
  }))

  const sideways = scored.filter((option) => option.candidate[0] !== 0 && option.room >= 0)
  const pool = sideways.length > 0 ? sideways : scored

  const best = pool.reduce((winner, option) =>
    option.room > winner.room ? option : winner,
  ).candidate

  const atRest = patchRoom(worldOf(best[0], best[1], 0))
  const atFull = patchRoom(worldOf(best[0], best[1], ideal))
  const distance = atFull >= 0 ? ideal : (ideal * atRest) / (atRest - atFull)

  return { x: best[0], z: best[1], distance: Math.max(0, Math.min(ideal, distance)) }
}

export function getSleevesLeftExtent(
  placements: readonly RecordSleevePlacement[],
  slides: readonly RecordSlide[],
  size = RECORD_SLEEVE_SIZE,
) {
  if (placements.length === 0) return 0

  const radius = (size * RECORD_VINYL_DIAMETER) / 2

  return placements.reduce((leftmost, sleeve, index) => {
    const corner = sleeve.x - footprintOf(sleeve.rotation, size) / 2
    const slide = slides[index]
    if (!slide) return Math.min(leftmost, corner)

    const along = slide.x * Math.cos(sleeve.rotation) + slide.z * Math.sin(sleeve.rotation)
    const record = sleeve.x + slide.distance * along - radius

    return Math.min(leftmost, corner, record)
  }, Number.POSITIVE_INFINITY)
}

export interface FloorView {
  readonly cameraY: number
  readonly cameraZ: number
  readonly targetY: number
  readonly targetZ: number
  readonly fov: number
  readonly aspect: number
  readonly floorY: number
}

export interface FloorWalls {
  readonly cornerZ: number
  readonly frontZ: number
  readonly halfWidth: number
}

export function getFloorViewForward(view: FloorView) {
  const towardTargetY = view.targetY - view.cameraY
  const towardTargetZ = view.targetZ - view.cameraZ
  const length = Math.hypot(towardTargetY, towardTargetZ)
  if (!(length > 0)) return null

  return { y: towardTargetY / length, z: towardTargetZ / length }
}

export function getFrameHalfWidthAt(z: number, height: number, view: FloorView) {
  const forward = getFloorViewForward(view)
  if (!forward) return 0

  const alongView =
    (view.floorY + height - view.cameraY) * forward.y + (z - view.cameraZ) * forward.z
  if (!(alongView > 0)) return 0

  return Math.tan((view.fov * Math.PI) / 360) * view.aspect * alongView
}

export function getFloorHalfWidthAt(z: number, view: FloorView) {
  return getFrameHalfWidthAt(z, 0, view)
}

export function getNearestVisibleZ(view: FloorView) {
  const forward = getFloorViewForward(view)
  if (!forward) return view.cameraZ

  const upY = -forward.z
  const upZ = forward.y
  const halfAngle = Math.tan((view.fov * Math.PI) / 360)

  const rayY = forward.y - upY * halfAngle
  const rayZ = forward.z - upZ * halfAngle
  const drop = view.floorY - view.cameraY
  if (!(rayY < 0) || !(drop < 0)) return view.cameraZ

  return view.cameraZ + (drop / rayY) * rayZ
}

export function getWallHalfWidthAt(z: number, walls: FloorWalls) {
  const span = walls.frontZ - walls.cornerZ
  if (!(span > 0)) return 0

  return Math.max(0, (walls.halfWidth * (z - walls.cornerZ)) / span)
}

export interface RecordSleevePatchOptions {
  readonly margin: number
  readonly depth: number
  readonly leftReach: number
  readonly minFarWidth: number
}

export function getRecordSleevePatch(
  view: FloorView,
  walls: FloorWalls,
  options: RecordSleevePatchOptions,
): RecordSleeveArea {
  const maxZ = getNearestVisibleZ(view) - options.margin

  const wallLimitZ =
    walls.cornerZ +
    ((options.minFarWidth + options.margin) * (walls.frontZ - walls.cornerZ)) /
      Math.max(walls.halfWidth, 1e-6)
  const minZ = Math.max(maxZ - options.depth, wallLimitZ)

  const frameMaxX = {
    near: getFloorHalfWidthAt(maxZ, view) - options.margin,
    far: getFloorHalfWidthAt(minZ, view) - options.margin,
  }
  const wallMaxX = {
    near: getWallHalfWidthAt(maxZ, walls) - options.margin,
    far: getWallHalfWidthAt(minZ, walls) - options.margin,
  }

  return {
    minX: -Math.min(options.leftReach, Math.max(0, Math.min(frameMaxX.near, wallMaxX.near))),
    frameMaxX,
    wallMaxX,
    minZ,
    maxZ,
  }
}

export function unionScreenRects(a: ScreenRect | null, b: ScreenRect | null): ScreenRect | null {
  if (!a) return b
  if (!b) return a

  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)

  return {
    left,
    top,
    width: Math.max(a.left + a.width, b.left + b.width) - left,
    height: Math.max(a.top + a.height, b.top + b.height) - top,
  }
}

export interface RecordSleeveRaise {
  readonly turn: number
  readonly tilt: number
}

function shortestTurn(angle: number) {
  const wrapped = ((angle + Math.PI) % (Math.PI * 2)) - Math.PI

  return wrapped <= -Math.PI ? wrapped + Math.PI * 2 : wrapped
}

export function getRecordSleeveRaise(
  placement: RecordSleevePlacement,
  view: FloorView,
): RecordSleeveRaise {
  const toCameraX = -placement.x
  const toCameraZ = view.cameraZ - placement.z
  const turn = shortestTurn(Math.atan2(toCameraX, toCameraZ) - placement.rotation)

  const away = Math.hypot(toCameraX, toCameraZ)
  const above = view.cameraY - view.floorY
  const tilt = away > 0 || above > 0 ? Math.PI / 2 - Math.atan2(above, away) : 0

  return { turn, tilt }
}

const sleeveCorner = new THREE.Vector3()
const sleeveCameraSpace = new THREE.Vector3()
const CORNER_SIGNS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]

export function getSleeveScreenRect(
  camera: THREE.PerspectiveCamera,
  placement: RecordSleevePlacement,
  floorY: number,
  size: number,
  view: ScreenRect,
): ScreenRect | null {
  if (!(view.width > 0) || !(view.height > 0) || !(size > 0)) return null

  const half = size / 2
  const cos = Math.cos(placement.rotation)
  const sin = Math.sin(placement.rotation)

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const [signX, signZ] of CORNER_SIGNS) {
    const offsetX = signX * half
    const offsetZ = signZ * half

    sleeveCorner.set(
      placement.x + offsetX * cos + offsetZ * sin,
      floorY,
      placement.z - offsetX * sin + offsetZ * cos,
    )

    sleeveCameraSpace.copy(sleeveCorner).applyMatrix4(camera.matrixWorldInverse)
    if (sleeveCameraSpace.z >= 0) return null

    sleeveCorner.project(camera)

    const x = view.left + (sleeveCorner.x * 0.5 + 0.5) * view.width
    const y = view.top + (-sleeveCorner.y * 0.5 + 0.5) * view.height
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
}
