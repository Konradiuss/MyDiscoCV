import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { AUDIO_BAND_COUNT } from '../audio/audioLevels'
import { getMeterGrid } from '../components/controls/levelMeter'
import {
  DECK_METRES,
  SPEAKER_METRES,
  getFloorPropLayout,
  getFloorPropPatch,
  getFloorPropScale,
  getFramedHeightAt,
  getHiddenHeightAt,
  getTonearmRestTurn,
  type FloorPropBox,
} from '../components/disco/floorProps'
import {
  getAreaMaxX,
  getFloorHalfWidthAt,
  getRecordSleeveLayout,
  getRecordSleevePatch,
  getRecordSleeveSize,
  getRecordSlide,
  getSleevesLeftExtent,
  getWallHalfWidthAt,
  type FloorView,
} from '../components/disco/recordSleeves'

const floorY = -2.7
const walls = { cornerZ: -3.4, frontZ: 5, halfWidth: 11 }
const desktopView: FloorView = {
  cameraY: -0.05,
  cameraZ: 5.5,
  targetY: -2.05,
  targetZ: 0.55,
  fov: 35,
  aspect: 16 / 9,
  floorY,
}
const pageView: FloorView = {
  cameraY: 0.08,
  cameraZ: 5.7,
  targetY: 0.78,
  targetZ: -0.45,
  fov: 35,
  aspect: 16 / 9,
  floorY,
}
const options = { margin: 0.15, clearance: 0.25, depth: 4, minFarWidth: 1.5, minFit: 0.7 }

const sleeveArea = getRecordSleevePatch(desktopView, walls, {
  margin: 0.15,
  depth: 3.85,
  leftReach: 0.6,
  minFarWidth: 1,
})
const sleeveSize = getRecordSleeveSize(3, sleeveArea)
const sleeves = getRecordSleeveLayout(3, sleeveArea, sleeveSize)
const slides = sleeves.map((_unused, index) =>
  getRecordSlide(index, sleeves, sleeveArea, sleeveSize),
)
const playlistEnds = getSleevesLeftExtent(sleeves, slides, sleeveSize)
const nearestSleeve = sleeves.reduce((front, sleeve) => (sleeve.z > front.z ? sleeve : front))

function patchFor(view: FloorView) {
  return getFloorPropPatch(view, walls, playlistEnds, options)
}

function layoutFor(view: FloorView) {
  return getFloorPropLayout(patchFor(view), view, sleeveSize, options, {
    aimAt: nearestSleeve,
    whileScrolling: { ...pageView, aspect: view.aspect },
  })
}

const area = patchFor(desktopView)
const layout = layoutFor(desktopView)!

function createCamera(aspect = 16 / 9, fov = 35) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100)
  camera.position.set(0, desktopView.cameraY, desktopView.cameraZ)
  camera.lookAt(0, desktopView.targetY, desktopView.targetZ)
  camera.updateMatrixWorld()
  return camera
}

function toRoom(box: FloorPropBox, localX: number, localZ: number) {
  const cos = Math.cos(box.rotation)
  const sin = Math.sin(box.rotation)

  return { x: box.x + localX * cos + localZ * sin, z: box.z - localX * sin + localZ * cos }
}

function footprintOf(box: FloorPropBox) {
  return [-1, 1].flatMap((signX) =>
    [-1, 1].map((signZ) => toRoom(box, (signX * box.width) / 2, (signZ * box.depth) / 2)),
  )
}

function cornersOf(box: FloorPropBox) {
  return [-1, 1].flatMap((signX) =>
    [-1, 1].flatMap((signZ) => {
      const floorPoint = toRoom(box, (signX * box.width) / 2, (signZ * box.depth) / 2)

      return [floorY, floorY + box.height].map(
        (y) => new THREE.Vector3(floorPoint.x, y, floorPoint.z),
      )
    }),
  )
}

function spanOf(box: FloorPropBox) {
  const cos = Math.abs(Math.cos(box.rotation))
  const sin = Math.abs(Math.sin(box.rotation))

  return { x: box.width * cos + box.depth * sin, z: box.width * sin + box.depth * cos }
}

describe('how tall a thing may be here', () => {
  it('reaches exactly the top of the frame, wherever it stands across the room', () => {
    const camera = createCamera()
    const z = 0.4
    const height = getFramedHeightAt(z, desktopView)

    for (const x of [-1, -2.4, -3.5]) {
      const top = new THREE.Vector3(x, floorY + height, z).project(camera)

      expect(top.y).toBeCloseTo(1, 6)
    }

    const taller = new THREE.Vector3(-2.4, floorY + height * 1.05, z).project(camera)
    expect(taller.y).toBeGreaterThan(1)
  })

  it('allows less of it the further into the room a thing stands', () => {
    expect(getFramedHeightAt(-1, desktopView)).toBeLessThan(getFramedHeightAt(1, desktopView))
  })

  it('does not care about the shape of the window', () => {
    expect(getFramedHeightAt(0, { ...desktopView, aspect: 4 / 3 })).toBeCloseTo(
      getFramedHeightAt(0, desktopView),
      9,
    )
  })

  it('has no answer to give where the frame points above the horizontal', () => {
    expect(getFramedHeightAt(0, { ...desktopView, targetY: 20 })).toBe(Number.POSITIVE_INFINITY)
    expect(getFramedHeightAt(0, { ...desktopView, targetY: -0.05, targetZ: 5.5 })).toBe(0)
  })

  it('caps the speaker from above, so the floor view cannot cut it through', () => {
    expect(1 * getFloorPropScale(sleeveSize)).toBeGreaterThan(
      getFramedHeightAt(layout.speaker.z - layout.speaker.depth, desktopView),
    )
    expect(layout.speaker.height).toBeLessThanOrEqual(
      getFramedHeightAt(layout.speaker.z - layout.speaker.depth, desktopView),
    )
  })
})

describe('how tall a thing may be while the page is still being read', () => {
  it('reaches exactly the bottom of the frame, wherever it stands across the room', () => {
    const camera = createCamera()
    camera.position.set(0, pageView.cameraY, pageView.cameraZ)
    camera.lookAt(0, pageView.targetY, pageView.targetZ)
    camera.updateMatrixWorld()

    const z = -0.5
    const height = getHiddenHeightAt(z, pageView)

    for (const x of [-1, -2.4, -3.5]) {
      expect(new THREE.Vector3(x, floorY + height, z).project(camera).y).toBeCloseTo(-1, 6)
    }

    const taller = new THREE.Vector3(-2.4, floorY + height * 1.05, z).project(camera)
    expect(taller.y).toBeGreaterThan(-1)
  })

  it('allows less of it the further into the room a thing stands', () => {
    expect(getHiddenHeightAt(-1, pageView)).toBeLessThan(getHiddenHeightAt(1, pageView))
  })

  it('hides everything from a camera pointed away from the floor, and nothing from one on it', () => {
    expect(getHiddenHeightAt(0, { ...pageView, targetY: 20 })).toBeGreaterThan(
      getHiddenHeightAt(0, pageView),
    )
    expect(getHiddenHeightAt(0, desktopView)).toBe(0)
  })

  it('is what settles the speaker, and it is the tighter of the two frames', () => {
    const lifeSize = SPEAKER_METRES.height * getFloorPropScale(sleeveSize)
    const deepestCornerZ = layout.speaker.z - layout.speaker.depth

    expect(lifeSize).toBeGreaterThan(getHiddenHeightAt(deepestCornerZ, pageView))
    expect(layout.speaker.height).toBeLessThan(lifeSize)
    expect(getHiddenHeightAt(deepestCornerZ, pageView)).toBeLessThan(
      getFramedHeightAt(deepestCornerZ, desktopView),
    )
    expect(layout.speaker.height / layout.speaker.width).toBeCloseTo(
      SPEAKER_METRES.height / SPEAKER_METRES.width,
      9,
    )
  })

  it('leaves nothing showing above the bottom of the page frame', () => {
    const camera = createCamera()
    camera.position.set(0, pageView.cameraY, pageView.cameraZ)
    camera.lookAt(0, pageView.targetY, pageView.targetZ)
    camera.updateMatrixWorld()

    for (const box of [layout.deck, layout.speaker]) {
      for (const corner of cornersOf(box)) {
        expect(corner.clone().project(camera).y).toBeLessThanOrEqual(-1 + 1e-6)
      }
    }
  })
})

describe('the patch on the left of the floor', () => {
  it('starts where the playlist ends, and not one bit sooner', () => {
    expect(area.minX).toBeCloseTo(-playlistEnds + options.clearance, 9)
    expect(playlistEnds).toBeLessThan(0)
  })

  it('keeps clear of the frame and of the walls all the way down', () => {
    for (const z of [area.maxZ, (area.maxZ + area.minZ) / 2, area.minZ]) {
      expect(getAreaMaxX(area, z)).toBeLessThan(getFloorHalfWidthAt(z, desktopView))
      expect(getAreaMaxX(area, z)).toBeLessThan(getWallHalfWidthAt(z, walls))
    }
  })

  it('stops before the walls pinch off the floor it was after', () => {
    const deep = getFloorPropPatch(desktopView, walls, playlistEnds, {
      ...options,
      depth: 40,
    })

    expect(deep.minZ).toBeGreaterThan(walls.cornerZ)
    expect(getAreaMaxX(deep, deep.minZ) - deep.minX).toBeGreaterThanOrEqual(
      options.minFarWidth - 1e-9,
    )
  })
})

describe('where the deck and the speaker stand', () => {
  it('is the same room on every visit', () => {
    expect(layoutFor(desktopView)).toEqual(layout)
  })

  it('leaves the playlist its floor, records and all', () => {
    for (const box of [layout.deck, layout.speaker]) {
      expect(box.x + spanOf(box).x / 2).toBeLessThanOrEqual(-area.minX + 1e-9)
    }

    expect(-area.minX).toBeLessThanOrEqual(playlistEnds - options.clearance + 1e-9)
  })

  it('keeps every corner of both inside the frame', () => {
    const camera = createCamera()

    for (const box of [layout.deck, layout.speaker]) {
      for (const corner of cornersOf(box)) {
        const projected = corner.clone().project(camera)

        expect(Math.abs(projected.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(projected.y)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps every foot of both on the floor it was given', () => {
    for (const box of [layout.deck, layout.speaker]) {
      const span = spanOf(box)

      expect(box.z + span.z / 2).toBeLessThanOrEqual(area.maxZ + 1e-9)
      expect(box.z - span.z / 2).toBeGreaterThanOrEqual(area.minZ - 1e-9)

      for (const signX of [-1, 1]) {
        for (const signZ of [-1, 1]) {
          const corner = toRoom(box, (signX * box.width) / 2, (signZ * box.depth) / 2)

          expect(-corner.x).toBeLessThanOrEqual(getAreaMaxX(area, corner.z) + 1e-9)
        }
      }
    }
  })

  it('never lets the two of them share any floor', () => {
    const axes = [layout.deck, layout.speaker].flatMap((box) => [
      { x: Math.cos(box.rotation), z: -Math.sin(box.rotation) },
      { x: Math.sin(box.rotation), z: Math.cos(box.rotation) },
    ])
    const shadowOn = (box: FloorPropBox, axis: { x: number; z: number }) =>
      footprintOf(box).map((corner) => corner.x * axis.x + corner.z * axis.z)

    const apart = axes.some((axis) => {
      const deck = shadowOn(layout.deck, axis)
      const speaker = shadowOn(layout.speaker, axis)

      return Math.min(...deck) > Math.max(...speaker) || Math.min(...speaker) > Math.max(...deck)
    })

    expect(apart).toBe(true)
  })

  it('puts the deck out in the near corner and the speaker in beside the records', () => {
    expect(layout.deck.z).toBeGreaterThan(layout.speaker.z)
    expect(layout.deck.x).toBeLessThan(layout.speaker.x)

    expect(-(layout.speaker.x + spanOf(layout.speaker).x / 2)).toBeCloseTo(area.minX, 9)

    expect(layout.deck.x + spanOf(layout.deck).x / 2).toBeGreaterThan(
      layout.speaker.x - spanOf(layout.speaker).x / 2,
    )
  })

  it('turns the speaker to face the record it was aimed at', () => {
    const target = { x: 0.99, z: 1.52 }
    const aimed = getFloorPropLayout(area, desktopView, sleeveSize, options, { aimAt: target })!
    const front = {
      x: Math.sin(aimed.speaker.rotation),
      z: Math.cos(aimed.speaker.rotation),
    }
    const toward = { x: target.x - aimed.speaker.x, z: target.z - aimed.speaker.z }
    const length = Math.hypot(toward.x, toward.z)

    const off = Math.acos((front.x * toward.x + front.z * toward.z) / length)
    expect(off).toBeLessThan(0.05)
    expect(aimed.speaker.rotation).toBeGreaterThan(aimed.deck.rotation)
  })

  it('keeps the old square-on turn when there is nothing to aim at', () => {
    const straight = getFloorPropLayout(area, desktopView, sleeveSize, options)!

    expect(straight.speaker.rotation).toBe(straight.deck.rotation)
    expect(straight.speaker.height).toBeGreaterThan(layout.speaker.height)
  })

  it('holds the real proportions where the floor can afford them', () => {
    const scale = getFloorPropScale(sleeveSize)

    expect(layout.deck.width).toBeCloseTo(DECK_METRES.width * scale, 9)
    expect(layout.deck.depth).toBeCloseTo(DECK_METRES.depth * scale, 9)
    expect(layout.deck.width).toBeGreaterThan(sleeveSize)
  })

  it('takes the pair down rather than let it hang off a squarer frame', () => {
    const squareView = { ...desktopView, aspect: 1 }
    const square = layoutFor(squareView)!
    const squareArea = patchFor(squareView)
    const camera = createCamera(squareView.aspect)

    expect(square.deck.width).toBeLessThan(layout.deck.width)
    expect(square.deck.width / square.deck.depth).toBeCloseTo(
      layout.deck.width / layout.deck.depth,
      9,
    )

    for (const box of [square.deck, square.speaker]) {
      for (const signX of [-1, 1]) {
        for (const signZ of [-1, 1]) {
          const corner = toRoom(box, (signX * box.width) / 2, (signZ * box.depth) / 2)

          expect(-corner.x).toBeLessThanOrEqual(getAreaMaxX(squareArea, corner.z) + 1e-9)
        }
      }
      for (const corner of cornersOf(box)) {
        expect(Math.abs(corner.clone().project(camera).x)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('gives up rather than furnish a doll house', () => {
    expect(layoutFor({ ...desktopView, fov: 31, aspect: 390 / 844 })).toBeNull()
  })
})

describe('the cable between them', () => {
  it('runs from the deck to the speaker', () => {
    const ends = [layout.cable[0]!, layout.cable[layout.cable.length - 1]!]
    const reach = (box: FloorPropBox) => Math.max(spanOf(box).x, spanOf(box).z)

    expect(Math.hypot(ends[0]!.x - layout.deck.x, ends[0]!.z - layout.deck.z)).toBeLessThan(
      reach(layout.deck),
    )
    expect(Math.hypot(ends[1]!.x - layout.speaker.x, ends[1]!.z - layout.speaker.z)).toBeLessThan(
      reach(layout.speaker),
    )
  })

  it('bows toward the viewer instead of running straight', () => {
    const [from, , , to] = layout.cable
    const middle = layout.cable.slice(1, -1)

    expect(Math.abs(to!.x - from!.x)).toBeGreaterThan(0.3)

    middle.forEach((point) => {
      const along = (point.x - from!.x) / (to!.x - from!.x)
      const straight = from!.z + (to!.z - from!.z) * along

      expect(point.z).toBeGreaterThan(straight)
    })
  })

  it('stays on the floor the camera can see', () => {
    layout.cable.forEach((point) => {
      expect(-point.x).toBeLessThanOrEqual(getAreaMaxX(area, point.z) + 1e-9)
      expect(point.z).toBeLessThanOrEqual(area.maxZ + 1e-9)
      expect(point.z).toBeGreaterThanOrEqual(area.minZ - 1e-9)
    })
  })
})

describe('the controls on the front of the deck', () => {
  const { plate, plateInset, pad, glyphRadius, glyphBar, wheel, spacing } = DECK_METRES.controls
  const faceLeft = -DECK_METRES.width / 2
  const plateLeft = faceLeft + plateInset
  const spanOf = (offset: number, width: number) => [
    plateLeft + offset - width / 2,
    plateLeft + offset + width / 2,
  ]

  const play = spanOf(spacing.play, pad.width)
  const restart = spanOf(spacing.restart, pad.width)
  const volume = spanOf(spacing.wheel, wheel.width)

  const { readout } = DECK_METRES.controls
  const windowWidth = (readout.glassHeight * 64) / 20 + readout.padding * 2
  const windowLeft = volume[1]! + readout.gap
  const windowHeight = readout.glassHeight + readout.padding * 2

  it('keeps the whole row on the panel, and the panel on the face', () => {
    expect(play[0]!).toBeGreaterThan(plateLeft)
    expect(windowLeft + windowWidth).toBeLessThan(plateLeft + plate.width)
    expect(plateLeft + plate.width).toBeLessThan(-faceLeft)
  })

  it('leaves the readout clear of the wheel and inside the panel', () => {
    expect(windowLeft).toBeGreaterThan(volume[1]!)
    expect(windowHeight).toBeLessThan(plate.height)
  })

  it('leaves daylight between all three', () => {
    expect(restart[0]!).toBeGreaterThan(play[1]!)
    expect(volume[0]! - restart[1]!).toBeGreaterThan(restart[0]! - play[1]!)
  })

  it('fits up the face of a plinth this low', () => {
    expect(plate.height).toBeLessThan(DECK_METRES.height)
    expect(wheel.diameter).toBeLessThan(plate.height)
    expect(pad.height).toBeLessThan(plate.height)
  })

  it('leaves a pressed key still standing proud of its panel', () => {
    expect(pad.travel).toBeGreaterThan(0)
    expect(pad.travel).toBeLessThan(pad.relief)
  })

  it('keeps the mark inside the key it is printed on', () => {
    const mark = glyphRadius * 1.5 + glyphBar.gap + glyphBar.width

    expect(mark).toBeLessThan(pad.width)
    expect(glyphRadius * 2).toBeLessThan(pad.height)
  })
})

describe('the face of the speaker', () => {
  const { height, facing, driver, meter } = SPEAKER_METRES
  const wooferOuter = (SPEAKER_METRES.wooferDiameter / 2) * (1 + driver.rimWidth)
  const midOuter = (SPEAKER_METRES.midDiameter / 2) * (1 + driver.rimWidth)
  const wooferTop = facing.woofer * height + wooferOuter
  const wooferBottom = facing.woofer * height - wooferOuter
  const midTop = facing.mid * height + midOuter
  const midBottom = facing.mid * height - midOuter
  const meterTop = facing.meter * height + meter.height / 2
  const meterBottom = facing.meter * height - meter.height / 2

  it('stacks the meter under both drivers, with daylight at every join', () => {
    expect(meterBottom).toBeGreaterThan(0)
    expect(meterTop).toBeLessThan(wooferBottom)
    expect(wooferTop).toBeLessThan(midBottom)
    expect(midTop).toBeLessThan(height)
  })

  it('makes the upper cone smaller than the lower one, but not by much', () => {
    expect(SPEAKER_METRES.midDiameter).toBeLessThan(SPEAKER_METRES.wooferDiameter)
    expect(SPEAKER_METRES.midDiameter).toBeGreaterThan(SPEAKER_METRES.wooferDiameter * 0.6)
    expect(SPEAKER_METRES.midDepth).toBeLessThan(SPEAKER_METRES.wooferDepth)
  })

  it('keeps everything inside the width of the cabinet', () => {
    const half = SPEAKER_METRES.width / 2

    expect(wooferOuter).toBeLessThan(half)
    expect(midOuter).toBeLessThan(half)
    expect(meter.width / 2).toBeLessThan(half)
    expect(meter.width).toBeLessThanOrEqual(SPEAKER_METRES.wooferDiameter)
  })

  it('stands the indicator midway between the glass and the corner', () => {
    const edge = SPEAKER_METRES.width / 2
    const centre = edge - SPEAKER_METRES.ledInset

    expect(facing.led).toBe(facing.meter)
    expect(centre - meter.width / 2).toBeCloseTo(edge - centre, 9)
    expect(edge - centre).toBeGreaterThan(SPEAKER_METRES.ledDiameter)
  })

  it('has a column for every band the room is given', () => {
    expect(meter.columns).toBe(AUDIO_BAND_COUNT)
  })

  it('fits its divisions inside its glass', () => {
    const grid = getMeterGrid(meter.columns, meter.rows, meter.rowPitch)
    const inner = {
      width: meter.width - meter.padding * 2,
      height: meter.height - meter.padding * 2,
    }
    const unit = Math.min(inner.width / grid.width, inner.height / grid.height)

    expect(unit).toBeGreaterThan(0)
    expect(grid.width * unit).toBeLessThanOrEqual(inner.width + 1e-9)
    expect(grid.height * unit).toBeLessThanOrEqual(inner.height + 1e-9)
    expect(grid.width * unit).toBeGreaterThan(inner.width * 0.85)
    expect(grid.height * unit).toBeGreaterThan(inner.height * 0.85)
  })

  it('stands its bolts on top of the frame that carries them', () => {
    expect(driver.boltRelief).toBeGreaterThan(driver.rimRelief)
    expect(driver.boltDiameter).toBeLessThan(driver.rimWidth)
  })
})

describe('where the tonearm waits when nothing is playing', () => {
  const toPlatter = 0.255
  const reach = 0.184
  const platterRadius = 0.166

  const stylusFrom = (turn: number, playTurn: number) =>
    Math.hypot(
      Math.sin(turn) * reach - Math.sin(playTurn) * toPlatter,
      Math.cos(turn) * reach - Math.cos(playTurn) * toPlatter,
    )

  it('takes the stylus off the record by exactly the clearance asked for', () => {
    const playTurn = -0.97
    const keepOff = platterRadius + 0.015
    const rest = getTonearmRestTurn(playTurn, toPlatter, reach, keepOff)

    expect(stylusFrom(rest, playTurn)).toBeCloseTo(keepOff, 9)
    expect(stylusFrom(playTurn, playTurn)).toBeLessThan(platterRadius)
  })

  it('turns the arm forward, whichever way it was pointing to start with', () => {
    for (const playTurn of [-0.97, 0, 1.2, -2.5]) {
      expect(getTonearmRestTurn(playTurn, toPlatter, reach, 0.18)).toBeGreaterThan(playTurn)
    }
  })

  it('leaves an arm that is already clear where it stands', () => {
    expect(getTonearmRestTurn(0.4, toPlatter, reach, 0.05)).toBe(0.4)
  })

  it('points an arm that could never clear the record away from it', () => {
    expect(getTonearmRestTurn(0.4, toPlatter, 0.02, 0.9)).toBeCloseTo(0.4 + Math.PI, 9)
  })
})
