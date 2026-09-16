import {
  getAreaMaxX,
  getFloorHalfWidthAt,
  getFloorViewForward,
  getFrameHalfWidthAt,
  getNearestVisibleZ,
  getWallHalfWidthAt,
  type FloorView,
  type FloorWalls,
  type RecordSleeveArea,
} from './recordSleeves'

const SLEEVE_METRES = 0.3143

export const DECK_METRES = {
  width: 0.45,
  height: 0.08,
  depth: 0.37,
  platterDiameter: 0.332,
  platterHeight: 0.028,
  matHeight: 0.004,
  spindleDiameter: 0.007,
  spindleHeight: 0.035,
  armBaseDiameter: 0.055,
  armBaseHeight: 0.05,
  armDiameter: 0.014,
  headshell: { width: 0.03, height: 0.022, depth: 0.055 },
  armRest: { clearance: 0.015, diameter: 0.016, height: 0.012 },
  knobDiameter: 0.032,
  knobHeight: 0.014,
  faderLength: 0.11,
  ledDiameter: 0.011,
  controls: {
    plate: { width: 0.279, height: 0.054, relief: 0.002 },
    plateInset: 0.014,
    pad: { width: 0.042, height: 0.032, relief: 0.004, travel: 0.0025 },
    glyphRadius: 0.009,
    glyphBar: { width: 0.003, gap: 0.002 },
    wheel: { diameter: 0.05, width: 0.018, facets: 24 },
    knurl: { count: 12, width: 0.0013, relief: 0.0006 },
    wheelReach: 0.34,
    readout: { glassHeight: 0.026, padding: 0.008, relief: 0.0015, gap: 0.014 },
    spacing: { play: 0.033, restart: 0.083, wheel: 0.145 },
  },
} as const

export const SPEAKER_METRES = {
  width: 0.42,
  height: 0.7,
  depth: 0.38,
  wooferDiameter: 0.3,
  wooferDepth: 0.06,
  midDiameter: 0.22,
  midDepth: 0.045,
  ledDiameter: 0.014,
  ledInset: 0.03,
  facing: { meter: 0.0743, woofer: 0.3814, mid: 0.8071, led: 0.0743 },
  driver: {
    rimWidth: 0.1,
    rimRelief: 0.004,
    surroundRoll: 0.05,
    bolts: 8,
    boltDiameter: 0.08,
    boltRelief: 0.006,
    capReach: 0.55,
  },
  meter: {
    width: 0.3,
    height: 0.076,
    padding: 0.006,
    relief: 0.0015,
    columns: 7,
    rows: 8,
    rowPitch: 1.5,
  },
} as const

export const CABLE_METRES = { diameter: 0.006 } as const

const PROP_TURN = 0.2
const PROP_GAP_METRES = 0.04

export type FloorPropArea = RecordSleeveArea

export interface FloorPropBox {
  readonly x: number
  readonly z: number
  readonly rotation: number
  readonly width: number
  readonly height: number
  readonly depth: number
}

export interface FloorPoint {
  readonly x: number
  readonly z: number
}

export interface FloorPropLayout {
  readonly deck: FloorPropBox
  readonly speaker: FloorPropBox
  readonly cable: readonly FloorPoint[]
}

export interface FloorPropScene {
  readonly aimAt?: FloorPoint | null
  readonly whileScrolling?: FloorView | null
}

export function getFloorPropScale(sleeveSize: number) {
  return sleeveSize / SLEEVE_METRES
}

export function getFramedHeightAt(z: number, view: FloorView) {
  const forward = getFloorViewForward(view)
  if (!forward) return 0

  const halfAngle = Math.tan((view.fov * Math.PI) / 360)
  const denominator = -forward.z - halfAngle * forward.y
  if (!(denominator > 0)) return Number.POSITIVE_INFINITY

  const drop = view.floorY - view.cameraY
  const height = ((z - view.cameraZ) * (halfAngle * forward.z - forward.y)) / denominator - drop

  return Math.max(0, height)
}

export function getHiddenHeightAt(z: number, view: FloorView) {
  const forward = getFloorViewForward(view)
  if (!forward) return 0

  const halfAngle = Math.tan((view.fov * Math.PI) / 360)
  const denominator = -forward.z + halfAngle * forward.y
  if (!(denominator > 0)) return Number.POSITIVE_INFINITY

  const drop = view.floorY - view.cameraY
  const height = ((z - view.cameraZ) * (-halfAngle * forward.z - forward.y)) / denominator - drop

  return Math.max(0, height)
}

export function getTonearmRestTurn(
  playTurn: number,
  toPlatter: number,
  stylusReach: number,
  keepOff: number,
) {
  const spread = 2 * toPlatter * stylusReach
  if (!(spread > 0)) return playTurn

  const cosine = (toPlatter * toPlatter + stylusReach * stylusReach - keepOff * keepOff) / spread
  if (cosine <= -1) return playTurn + Math.PI

  return playTurn + Math.acos(Math.min(1, cosine))
}

export interface FloorPropOptions {
  readonly margin: number
  readonly clearance: number
  readonly depth: number
  readonly minFarWidth: number
  readonly minFit: number
}

export function getFloorPropPatch(
  view: FloorView,
  walls: FloorWalls,
  sleevesLeftExtent: number,
  options: FloorPropOptions,
): FloorPropArea {
  const maxZ = getNearestVisibleZ(view) - options.margin
  const minU = -sleevesLeftExtent + options.clearance

  const wallLimitZ =
    walls.cornerZ +
    ((minU + options.minFarWidth + options.margin) * (walls.frontZ - walls.cornerZ)) /
      Math.max(walls.halfWidth, 1e-6)
  const minZ = Math.max(maxZ - options.depth, wallLimitZ)

  return {
    minX: minU,
    frameMaxX: {
      near: getFloorHalfWidthAt(maxZ, view) - options.margin,
      far: getFloorHalfWidthAt(minZ, view) - options.margin,
    },
    wallMaxX: {
      near: getWallHalfWidthAt(maxZ, walls) - options.margin,
      far: getWallHalfWidthAt(minZ, walls) - options.margin,
    },
    minZ,
    maxZ,
  }
}

function nearestFittingNearEdge(area: FloorPropArea, needU: number, spanZ: number) {
  const depth = area.maxZ - area.minZ
  if (!(depth > 0) || !(spanZ > 0)) return null

  let nearest = area.maxZ
  let deepest = area.minZ + spanZ

  for (const edge of [area.frameMaxX, area.wallMaxX]) {
    const slope = (edge.near - edge.far) / depth

    for (const offset of [0, -spanZ]) {
      if (Math.abs(slope) < 1e-9) {
        if (edge.near < needU) return null
        continue
      }

      const bound = (needU - edge.near) / slope + area.maxZ - offset
      if (slope > 0) deepest = Math.max(deepest, bound)
      else nearest = Math.min(nearest, bound)
    }
  }

  return nearest >= deepest ? nearest : null
}

function spanOf(width: number, depth: number, turn: number) {
  const cos = Math.abs(Math.cos(turn))
  const sin = Math.abs(Math.sin(turn))

  return { u: width * cos + depth * sin, z: width * sin + depth * cos }
}

function turnToward(from: { x: number; z: number }, at: { x: number; z: number } | null) {
  if (!at) return PROP_TURN

  return Math.atan2(at.x - from.x, at.z - from.z)
}

const CORNER_SIGNS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]

function reachFor(
  area: FloorPropArea,
  view: FloorView,
  size: { width: number; height: number; depth: number },
  z: number,
  turn: number,
  margin: number,
) {
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)
  let allowed = Number.POSITIVE_INFINITY

  for (const [signX, signZ] of CORNER_SIGNS) {
    const localX = (signX * size.width) / 2
    const localZ = (signZ * size.depth) / 2
    const offsetU = -(localX * cos + localZ * sin)
    const cornerZ = z - localX * sin + localZ * cos

    for (const height of [0, size.height]) {
      const limit =
        height === 0
          ? getAreaMaxX(area, cornerZ)
          : getFrameHalfWidthAt(cornerZ, height, view) - margin

      allowed = Math.min(allowed, limit - offsetU)
    }
  }

  return allowed
}

function place(
  area: FloorPropArea,
  view: FloorView,
  scale: number,
  fit: number,
  options: FloorPropOptions,
  scene: FloorPropScene,
): FloorPropLayout | null {
  const deckSize = {
    width: DECK_METRES.width * scale * fit,
    height: DECK_METRES.height * scale * fit,
    depth: DECK_METRES.depth * scale * fit,
  }
  const deckSpan = spanOf(deckSize.width, deckSize.depth, PROP_TURN)

  const deckNearZ = nearestFittingNearEdge(area, area.minX + deckSpan.u, deckSpan.z)
  if (deckNearZ === null) return null

  const deckZ = deckNearZ - deckSpan.z / 2
  const deckU = reachFor(area, view, deckSize, deckZ, PROP_TURN, options.margin)
  if (deckU - deckSpan.u / 2 < area.minX) return null

  const speakerNearZ = deckNearZ - deckSpan.z - PROP_GAP_METRES * scale * fit

  const speakerWidth = SPEAKER_METRES.width * scale * fit
  const speakerDepth = SPEAKER_METRES.depth * scale * fit

  const guessSpan = spanOf(speakerWidth, speakerDepth, PROP_TURN)
  const speakerTurn = turnToward(
    { x: -(area.minX + guessSpan.u / 2), z: speakerNearZ - guessSpan.z / 2 },
    scene.aimAt ?? null,
  )

  const fullSpan = spanOf(speakerWidth, speakerDepth, speakerTurn)
  const deepestCornerZ = speakerNearZ - fullSpan.z
  const roomAbove = getFramedHeightAt(deepestCornerZ, view) - options.margin
  const roomBelow = scene.whileScrolling
    ? getHiddenHeightAt(deepestCornerZ, scene.whileScrolling)
    : Number.POSITIVE_INFINITY
  const speakerFit = Math.min(fit, Math.min(roomAbove, roomBelow) / (SPEAKER_METRES.height * scale))
  if (!(speakerFit > 0)) return null

  const speakerSize = {
    width: SPEAKER_METRES.width * scale * speakerFit,
    height: SPEAKER_METRES.height * scale * speakerFit,
    depth: SPEAKER_METRES.depth * scale * speakerFit,
  }
  const speakerSpan = spanOf(speakerSize.width, speakerSize.depth, speakerTurn)
  const speakerZ = speakerNearZ - speakerSpan.z / 2
  if (speakerNearZ - speakerSpan.z < area.minZ) return null

  const speakerU = area.minX + speakerSpan.u / 2
  if (speakerU > reachFor(area, view, speakerSize, speakerZ, speakerTurn, options.margin)) {
    return null
  }

  const deck: FloorPropBox = {
    x: -deckU,
    z: deckZ,
    rotation: PROP_TURN,
    ...deckSize,
  }
  const speaker: FloorPropBox = {
    x: -speakerU,
    z: speakerZ,
    rotation: speakerTurn,
    ...speakerSize,
  }

  return { deck, speaker, cable: runCable(deck, speaker, area) }
}

function cornerOf(box: FloorPropBox, localX: number, localZ: number) {
  const cos = Math.cos(box.rotation)
  const sin = Math.sin(box.rotation)

  return { x: box.x + localX * cos + localZ * sin, z: box.z - localX * sin + localZ * cos }
}

function runCable(deck: FloorPropBox, speaker: FloorPropBox, area: FloorPropArea) {
  const from = cornerOf(deck, deck.width * 0.3, -deck.depth / 2)
  const to = cornerOf(speaker, -speaker.width * 0.25, speaker.depth / 2)
  const bow = Math.hypot(to.x - from.x, to.z - from.z) * 0.3

  return [0, 0.36, 0.72, 1].map((along, index) => {
    const x = from.x + (to.x - from.x) * along
    const swing = index === 0 || index === 3 ? 0 : bow * (index === 1 ? 1 : 0.55)
    const z = Math.min(area.maxZ, from.z + (to.z - from.z) * along + swing)

    return { x: Math.max(-getAreaMaxX(area, z), x), z }
  })
}

export function getFloorPropLayout(
  area: FloorPropArea,
  view: FloorView,
  sleeveSize: number,
  options: FloorPropOptions,
  scene: FloorPropScene = {},
): FloorPropLayout | null {
  const scale = getFloorPropScale(sleeveSize)
  if (!(scale > 0)) return null

  const attempt = (fit: number) => place(area, view, scale, fit, options, scene)

  const atLifeSize = attempt(1)
  if (atLifeSize) return atLifeSize
  if (!attempt(options.minFit)) return null

  let works = options.minFit
  let fails = 1

  for (let step = 0; step < 16; step += 1) {
    const fit = (works + fails) / 2
    if (attempt(fit)) works = fit
    else fails = fit
  }

  return attempt(works)
}
