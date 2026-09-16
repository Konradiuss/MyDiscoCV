import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import {
  RECORD_LABEL_DIAMETER,
  RECORD_SLEEVE_ROTATION_MAX,
  RECORD_SLEEVE_SIZE,
  RECORD_SLIDE_SHARE,
  RECORD_VINYL_DIAMETER,
  getAreaMaxX,
  getRecordSlide,
  getRecordSlideOffset,
  getFloorHalfWidthAt,
  getNearestVisibleZ,
  getRecordSleeveLayout,
  getRecordSleevePatch,
  getRecordSleeveRaise,
  getRecordSleeveSeparation,
  getRecordSleeveSize,
  getSleeveScreenRect,
  getSleevesLeftExtent,
  getWallHalfWidthAt,
  unionScreenRects,
  type FloorView,
  type RecordSleeveArea,
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
const patchOptions = { margin: 0.15, depth: 3.85, leftReach: 0.6, minFarWidth: 1 }
const area = getRecordSleevePatch(desktopView, walls, patchOptions)

function halfFootprint(rotation: number, size: number) {
  return (size * (Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation)))) / 2
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100)
  camera.position.set(0, -0.05, 5.5)
  camera.lookAt(0, -2.05, 0.55)
  camera.updateMatrixWorld()
  return camera
}

const view = { left: 0, top: 0, width: 1280, height: 720 }

describe('visible floor', () => {
  it('finds the near edge where the bottom of the frame lands', () => {
    const nearest = getNearestVisibleZ(desktopView)

    expect(nearest).toBeCloseTo(5.5 - 2.65 / Math.tan((39.5 * Math.PI) / 180), 1)
  })

  it('sees more floor across it the further away it looks', () => {
    expect(getFloorHalfWidthAt(0, desktopView)).toBeGreaterThan(getFloorHalfWidthAt(2, desktopView))
  })

  it('sees less of it across a narrower window', () => {
    const narrow = { ...desktopView, aspect: 4 / 3 }

    expect(getFloorHalfWidthAt(2, narrow)).toBeLessThan(getFloorHalfWidthAt(2, desktopView))
    expect(getNearestVisibleZ(narrow)).toBeCloseTo(getNearestVisibleZ(desktopView), 9)
  })

  it('gives up on floor the camera has turned away from', () => {
    expect(getFloorHalfWidthAt(40, desktopView)).toBe(0)
    expect(getNearestVisibleZ({ ...desktopView, targetY: 4 })).toBe(desktopView.cameraZ)
  })

  it('closes the floor in as the walls come together', () => {
    expect(getWallHalfWidthAt(walls.frontZ, walls)).toBeCloseTo(walls.halfWidth, 9)
    expect(getWallHalfWidthAt(walls.cornerZ, walls)).toBe(0)
    expect(getWallHalfWidthAt(-6, walls)).toBe(0)
  })
})

describe('record sleeve patch', () => {
  it('keeps clear of the near edge, of the frame and of the walls', () => {
    expect(area.maxZ).toBeLessThan(getNearestVisibleZ(desktopView))

    for (const z of [area.maxZ, (area.maxZ + area.minZ) / 2, area.minZ]) {
      expect(getAreaMaxX(area, z)).toBeLessThan(getFloorHalfWidthAt(z, desktopView))
      expect(getAreaMaxX(area, z)).toBeLessThan(getWallHalfWidthAt(z, walls))
    }
  })

  it('reaches left of the room centre, but no further than asked', () => {
    expect(area.minX).toBeLessThan(0)
    expect(area.minX).toBeGreaterThanOrEqual(-patchOptions.leftReach)
  })

  it('stops short of the depth where the walls would pinch it out', () => {
    const deep = getRecordSleevePatch(desktopView, walls, { ...patchOptions, depth: 40 })

    expect(deep.minZ).toBeGreaterThan(walls.cornerZ)
    expect(getAreaMaxX(deep, deep.minZ)).toBeGreaterThanOrEqual(patchOptions.minFarWidth - 1e-9)
  })

  it('narrows with the window rather than hanging off the edge of it', () => {
    const narrow = getRecordSleevePatch({ ...desktopView, aspect: 4 / 3 }, walls, patchOptions)

    expect(getAreaMaxX(narrow, narrow.maxZ)).toBeLessThan(getAreaMaxX(area, area.maxZ))
    expect(narrow.wallMaxX).toEqual(area.wallMaxX)
  })

  it('keeps the widest floor, which is neither of its two ends', () => {
    const ends = Math.max(getAreaMaxX(area, area.maxZ), getAreaMaxX(area, area.minZ))
    const middles = [0.25, 0.5, 0.75].map((share) =>
      getAreaMaxX(area, area.maxZ - (area.maxZ - area.minZ) * share),
    )

    expect(Math.max(...middles)).toBeGreaterThan(ends)
  })
})

describe('record sleeve size', () => {
  it('gives the sleeves what was asked for while the floor can hold it', () => {
    expect(getRecordSleeveSize(3, area)).toBe(RECORD_SLEEVE_SIZE)
  })

  it('takes them down rather than let a longer playlist stack them up', () => {
    const six = getRecordSleeveSize(6, area)

    expect(six).toBeLessThan(RECORD_SLEEVE_SIZE)
    expect(
      halfFootprint(RECORD_SLEEVE_ROTATION_MAX, six) * 2 + getRecordSleeveSeparation(six) * 5,
    ).toBeLessThanOrEqual(area.maxZ - area.minZ + 1e-9)
  })

  it('takes them down to what a narrow frame can hold across it', () => {
    const phoneView: FloorView = { ...desktopView, fov: 31, aspect: 390 / 844 }
    const phone = getRecordSleevePatch(phoneView, walls, {
      margin: 0.07,
      depth: 3.2,
      leftReach: 0.6,
      minFarWidth: 0.5,
    })
    const size = getRecordSleeveSize(3, phone, 0.8)

    expect(size).toBeLessThan(0.8)
    expect(halfFootprint(RECORD_SLEEVE_ROTATION_MAX, size) * 2).toBeLessThanOrEqual(
      getAreaMaxX(phone, phone.maxZ) - phone.minX + 1e-9,
    )
    expect(size).toBeGreaterThan(0.6)
  })

  it('has nothing to size for an empty playlist or an empty patch', () => {
    expect(getRecordSleeveSize(0, area)).toBe(0)
    expect(getRecordSleeveSize(3, { ...area, minZ: area.maxZ })).toBe(0)
  })
})

describe('record sleeve layout', () => {
  const size = getRecordSleeveSize(3, area)
  const sleeves = getRecordSleeveLayout(3, area, size)

  it('is the same room on every visit', () => {
    expect(getRecordSleeveLayout(3, area, size)).toEqual(sleeves)
  })

  it('puts every sleeve down inside the patch it was given', () => {
    getRecordSleeveLayout(4, area).forEach((sleeve) => {
      const half = halfFootprint(sleeve.rotation, getRecordSleeveSize(4, area))

      expect(sleeve.x - half).toBeGreaterThanOrEqual(area.minX - 1e-9)
      expect(sleeve.z - half).toBeGreaterThanOrEqual(area.minZ - 1e-9)
      expect(sleeve.z + half).toBeLessThanOrEqual(area.maxZ + 1e-9)
      expect(sleeve.x + half).toBeLessThanOrEqual(
        Math.min(getAreaMaxX(area, sleeve.z - half), getAreaMaxX(area, sleeve.z + half)) + 1e-9,
      )
    })
  })

  it('never lets two sleeves overlap', () => {
    for (let index = 0; index < sleeves.length; index += 1) {
      for (let other = index + 1; other < sleeves.length; other += 1) {
        const near = sleeves[index]!
        const far = sleeves[other]!

        expect(Math.hypot(far.x - near.x, far.z - near.z)).toBeGreaterThanOrEqual(
          getRecordSleeveSeparation(size) - 1e-9,
        )
      }
    }
  })

  it('uses the depth of the patch, near to far', () => {
    const depths = sleeves.map((sleeve) => sleeve.z)

    expect(Math.max(...depths)).toBe(depths[0])
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan((area.maxZ - area.minZ) * 0.6)
  })

  it('spreads them across the floor instead of stringing them along one line', () => {
    const across = sleeves.map((sleeve) => sleeve.x)
    const usable =
      getAreaMaxX(area, area.maxZ) - area.minX - halfFootprint(RECORD_SLEEVE_ROTATION_MAX, size) * 2

    expect(new Set(across).size).toBe(across.length)
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(usable * 0.3)
  })

  it('turns them, but never past the tidy bound', () => {
    const rotations = getRecordSleeveLayout(5, area).map((sleeve) => sleeve.rotation)

    expect(Math.max(...rotations.map(Math.abs))).toBeLessThanOrEqual(RECORD_SLEEVE_ROTATION_MAX)
    expect(new Set(rotations).size).toBe(rotations.length)
  })

  it('has nothing to lay out for an empty playlist or an empty patch', () => {
    const flat: RecordSleeveArea = {
      ...area,
      frameMaxX: { near: area.minX, far: area.minX },
      wallMaxX: { near: area.minX, far: area.minX },
    }

    expect(getRecordSleeveLayout(0, area)).toEqual([])
    expect(getRecordSleeveLayout(3, { ...area, minZ: area.maxZ })).toEqual([])
    expect(getRecordSleeveLayout(3, flat)).toEqual([])
  })
})

describe('the record inside', () => {
  const size = RECORD_SLEEVE_SIZE
  const radius = (size * RECORD_VINYL_DIAMETER) / 2

  it('fits the sleeve it lives in, label and all', () => {
    expect(radius * 2).toBeLessThan(size)
    expect(RECORD_LABEL_DIAMETER).toBeLessThan(1)
  })

  it('leaves exactly the share of itself it promises', () => {
    const outside = getRecordSlideOffset(size) + radius - size / 2

    expect(outside / (radius * 2)).toBeCloseTo(RECORD_SLIDE_SHARE, 12)
    expect(getRecordSlideOffset(size)).toBeLessThan(size / 2 + radius)
  })

  it('comes out away from the sleeve next to it', () => {
    const middle = { x: 0, z: 0, rotation: 0 }
    const offset = getRecordSlideOffset(size)
    const crowdedRight = [middle, { x: offset, z: 0, rotation: 0 }]
    const crowdedLeft = [middle, { x: -offset, z: 0, rotation: 0 }]

    const gained = (placements: typeof crowdedRight) => {
      const slide = getRecordSlide(0, placements, area, size)
      const other = placements[1]!

      return (
        Math.hypot(other.x - slide.distance * slide.x, other.z - slide.distance * slide.z) -
        Math.hypot(other.x, other.z)
      )
    }

    expect(gained(crowdedRight)).toBeGreaterThan(0)
    expect(gained(crowdedLeft)).toBeGreaterThan(0)
    expect(getRecordSlide(0, crowdedRight, area, size).x).not.toBe(1)
    expect(getRecordSlide(0, crowdedLeft, area, size).x).not.toBe(-1)
  })

  it('comes out on the side away from the edge of the floor', () => {
    const againstTheRight = [
      { x: getAreaMaxX(area, 0) - halfFootprint(0, size), z: 0, rotation: 0 },
    ]
    const againstTheLeft = [{ x: area.minX + halfFootprint(0, size), z: 0, rotation: 0 }]

    expect(getRecordSlide(0, againstTheRight, area, size).x).toBe(-1)
    expect(getRecordSlide(0, againstTheLeft, area, size).x).toBe(1)
  })

  it('comes out of the side of the sleeve while the floor allows it', () => {
    const slide = getRecordSlide(0, [{ x: 0.3, z: 0, rotation: 0 }], area, size)

    expect(Math.abs(slide.x)).toBe(1)
    expect(slide.z).toBe(0)
  })

  it('turns into the room when there is no floor to either side', () => {
    const narrow: RecordSleeveArea = {
      ...area,
      minX: -0.5,
      frameMaxX: { near: 0.5, far: 0.9 },
      wallMaxX: { near: 8, far: 3 },
    }
    const slide = getRecordSlide(0, [{ x: 0, z: 0, rotation: 0 }], narrow, size)

    expect(slide.x).toBe(0)
    expect(Math.abs(slide.z)).toBe(1)
  })

  it('stops the record at the edge of the floor rather than past it', () => {
    const ideal = getRecordSlideOffset(size)
    const roomy = getRecordSlide(0, [{ x: 0, z: 0, rotation: 0 }], area, size)
    const edge = size / 2 + 0.05
    const pinched: RecordSleeveArea = {
      minX: -edge,
      frameMaxX: { near: edge, far: edge },
      wallMaxX: { near: edge, far: edge },
      minZ: -edge,
      maxZ: edge,
    }
    const cut = getRecordSlide(0, [{ x: 0, z: 0, rotation: 0 }], pinched, size)

    expect(roomy.distance).toBeCloseTo(ideal, 12)
    expect(cut.distance).toBeGreaterThan(0)
    expect(cut.distance).toBeLessThan(ideal)

    const x = cut.distance * cut.x
    const z = cut.distance * cut.z
    const radius = (size * RECORD_VINYL_DIAMETER) / 2
    expect(x - radius).toBeGreaterThanOrEqual(pinched.minX - 1e-9)
    expect(x + radius).toBeLessThanOrEqual(getAreaMaxX(pinched, z) + 1e-9)
    expect(z + radius).toBeLessThanOrEqual(pinched.maxZ + 1e-9)
    expect(z - radius).toBeGreaterThanOrEqual(pinched.minZ - 1e-9)
  })

  it('reports where the playlist ends, sleeve corner or record, whichever is further', () => {
    const radius = (size * RECORD_VINYL_DIAMETER) / 2
    const sleeve = { x: 0.8, z: 0, rotation: 0 }
    const goingRight = [{ x: 1, z: 0, distance: 0.5 }]

    expect(getSleevesLeftExtent([sleeve], [{ x: -1, z: 0, distance: 0.5 }], size)).toBeCloseTo(
      0.8 - 0.5 - radius,
      12,
    )
    expect(getSleevesLeftExtent([sleeve], goingRight, size)).toBeCloseTo(0.8 - size / 2, 12)
    expect(
      getSleevesLeftExtent([{ ...sleeve, rotation: RECORD_SLEEVE_ROTATION_MAX }], goingRight, size),
    ).toBeLessThan(0.8 - size / 2)

    const sleeves = getRecordSleeveLayout(3, area, size)
    const slides = sleeves.map((_unused, index) => getRecordSlide(index, sleeves, area, size))
    expect(getSleevesLeftExtent(sleeves, slides, size)).toBeGreaterThanOrEqual(area.minX - 1e-9)

    expect(getSleevesLeftExtent([], [], size)).toBe(0)
  })

  it('is the same room on every visit, and shrugs at a sleeve it has not got', () => {
    const sleeves = getRecordSleeveLayout(3, area)

    expect(sleeves.map((_unused, index) => getRecordSlide(index, sleeves, area))).toEqual(
      sleeves.map((_unused, index) => getRecordSlide(index, sleeves, area)),
    )
    expect(getRecordSlide(9, sleeves, area).distance).toBe(0)
  })
})

describe('record sleeve projection', () => {
  it('boxes the sleeve where the camera sees it', () => {
    const camera = createCamera()
    const rect = getSleeveScreenRect(
      camera,
      { x: 1.4, z: 1, rotation: 0.2 },
      floorY,
      RECORD_SLEEVE_SIZE,
      view,
    )!

    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(rect.left).toBeGreaterThan(view.width / 2)
    expect(rect.width).toBeGreaterThan(rect.height)
  })

  it('moves the box with the sleeve', () => {
    const camera = createCamera()
    const near = getSleeveScreenRect(camera, { x: 0.5, z: 1.4, rotation: 0 }, floorY, 0.9, view)!
    const far = getSleeveScreenRect(camera, { x: 1.8, z: 1.4, rotation: 0 }, floorY, 0.9, view)!

    expect(far.left).toBeGreaterThan(near.left)
  })

  it('gives up on a sleeve that is not in front of the camera', () => {
    const camera = createCamera()

    expect(getSleeveScreenRect(camera, { x: 0, z: 40, rotation: 0 }, floorY, 0.9, view)).toBeNull()
  })

  it('covers both the resting and the lifted sleeve at once', () => {
    const camera = createCamera()
    const placement = { x: 1, z: 1, rotation: 0.1 }
    const resting = getSleeveScreenRect(camera, placement, floorY, RECORD_SLEEVE_SIZE, view)!
    const lifted = getSleeveScreenRect(camera, placement, floorY + 0.13, RECORD_SLEEVE_SIZE, view)!
    const both = unionScreenRects(resting, lifted)!

    expect(lifted.top).toBeLessThan(resting.top)
    expect(both.top).toBeCloseTo(lifted.top, 6)
    expect(both.top + both.height).toBeCloseTo(resting.top + resting.height, 6)
    expect(both.height).toBeGreaterThan(resting.height)
  })

  it('unions around whichever box it was given', () => {
    const only = { left: 4, top: 8, width: 10, height: 12 }

    expect(unionScreenRects(only, null)).toEqual(only)
    expect(unionScreenRects(null, only)).toEqual(only)
    expect(unionScreenRects(null, null)).toBeNull()
  })

  it('gives up on a viewport with no area', () => {
    const camera = createCamera()
    const flat = { left: 0, top: 0, width: 0, height: 720 }

    expect(getSleeveScreenRect(camera, { x: 1.4, z: 1, rotation: 0 }, floorY, 0.9, flat)).toBeNull()
  })
})

describe('standing a sleeve up to be looked at', () => {
  const cameraAt = new THREE.Vector3(0, desktopView.cameraY, desktopView.cameraZ)

  function coverNormal(placement: { x: number; z: number; rotation: number }) {
    const { turn, tilt } = getRecordSleeveRaise(placement, desktopView)
    return new THREE.Vector3(0, 1, 0)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotation + turn)
  }

  function towardCamera(placement: { x: number; z: number }) {
    return cameraAt
      .clone()
      .sub(new THREE.Vector3(placement.x, floorY, placement.z))
      .normalize()
  }

  it('points the cover straight at the camera, wherever the sleeve lies', () => {
    for (const placement of [
      { x: 0, z: 1, rotation: 0 },
      { x: 2.4, z: 0.4, rotation: RECORD_SLEEVE_ROTATION_MAX },
      { x: -1.8, z: -1.2, rotation: -RECORD_SLEEVE_ROTATION_MAX },
      { x: 3.1, z: 2, rotation: 0.2 },
    ]) {
      expect(coverNormal(placement).dot(towardCamera(placement))).toBeCloseTo(1, 6)
    }
  })

  it('turns the short way round, never the long way', () => {
    for (const rotation of [0, RECORD_SLEEVE_ROTATION_MAX, -RECORD_SLEEVE_ROTATION_MAX, 3]) {
      const { turn } = getRecordSleeveRaise({ x: 1.6, z: 0.8, rotation }, desktopView)

      expect(Math.abs(turn)).toBeLessThanOrEqual(Math.PI)
    }
  })

  it('leaves a sleeve already facing the camera alone', () => {
    const { turn } = getRecordSleeveRaise({ x: 0, z: 1, rotation: 0 }, desktopView)

    expect(turn).toBeCloseTo(0, 9)
  })

  it('stands a distant sleeve up further than a near one', () => {
    const near = getRecordSleeveRaise({ x: 0.5, z: 2.4, rotation: 0 }, desktopView)
    const far = getRecordSleeveRaise({ x: 0.5, z: -2.4, rotation: 0 }, desktopView)

    expect(far.tilt).toBeGreaterThan(near.tilt)
    expect(far.tilt).toBeLessThan(Math.PI / 2)
  })
})
