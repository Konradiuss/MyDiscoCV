import { describe, expect, it } from 'vitest'

import {
  buildRoomGridPositions,
  getRoomGridCellSize,
  type RoomGridHalfSpace,
  type RoomGridPlane,
} from '../components/disco/roomGrid'

const unitPlane: RoomGridPlane = {
  origin: { x: 0, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  width: 1,
  height: 1,
}

function toSegments(positions: Float32Array) {
  const segments: { start: number[]; end: number[] }[] = []

  for (let offset = 0; offset < positions.length; offset += 6) {
    segments.push({
      start: [positions[offset]!, positions[offset + 1]!, positions[offset + 2]!],
      end: [positions[offset + 3]!, positions[offset + 4]!, positions[offset + 5]!],
    })
  }

  return segments
}

describe('room grid cell size', () => {
  it('converts a pixel size through the perspective frustum', () => {
    expect(getRoomGridCellSize(50, 90, 100, 1)).toBeCloseTo(1, 10)
  })

  it('scales with distance and against viewport height', () => {
    const base = getRoomGridCellSize(40, 35, 900, 9)

    expect(getRoomGridCellSize(40, 35, 900, 18)).toBeCloseTo(base * 2, 10)
    expect(getRoomGridCellSize(40, 35, 1800, 9)).toBeCloseTo(base / 2, 10)
    expect(getRoomGridCellSize(80, 35, 900, 9)).toBeCloseTo(base * 2, 10)
  })

  it('produces a sane cell for the shipped room', () => {
    const cell = getRoomGridCellSize(40, 35, 900, 9.127)

    expect(cell).toBeGreaterThan(0.2)
    expect(cell).toBeLessThan(0.32)
  })

  it('rejects degenerate cameras and viewports', () => {
    expect(() => getRoomGridCellSize(0, 35, 900, 9)).toThrow(RangeError)
    expect(() => getRoomGridCellSize(40, 0, 900, 9)).toThrow(RangeError)
    expect(() => getRoomGridCellSize(40, 180, 900, 9)).toThrow(RangeError)
    expect(() => getRoomGridCellSize(40, 35, 0, 9)).toThrow(RangeError)
    expect(() => getRoomGridCellSize(40, 35, 900, 0)).toThrow(RangeError)
  })
})

describe('room grid geometry', () => {
  it('closes the grid on both edges of an exact span', () => {
    const segments = toSegments(buildRoomGridPositions(unitPlane, 0.25))

    expect(segments).toHaveLength(10)
    expect(segments[0]!.start).toEqual([0, 0, 0])
    expect(segments[4]!.start).toEqual([1, 0, 0])
    expect(segments[4]!.end).toEqual([1, 1, 0])
  })

  it('always puts a line on the anchored origin', () => {
    const segments = toSegments(buildRoomGridPositions(unitPlane, 0.3))

    expect(segments[0]!.start).toEqual([0, 0, 0])
    expect(segments).toHaveLength(8)
  })

  it('lays the grid into the plane it was given', () => {
    const tilted: RoomGridPlane = {
      origin: { x: 0, y: -2, z: -3 },
      right: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      width: 2,
      height: 2,
    }

    toSegments(buildRoomGridPositions(tilted, 1)).forEach((segment) => {
      expect(segment.start[0]).toBe(0)
      expect(segment.end[0]).toBe(0)
    })
  })

  it('emits a whole segment when a half space contains it', () => {
    const keepEverything: RoomGridHalfSpace = { normal: { x: 0, y: 1, z: 0 }, constant: 10 }
    const clipped = buildRoomGridPositions(unitPlane, 0.25, [keepEverything])

    expect(Array.from(clipped)).toEqual(Array.from(buildRoomGridPositions(unitPlane, 0.25)))
  })

  it('trims segments to a half space and drops those fully outside', () => {
    const halfSpace: RoomGridHalfSpace = { normal: { x: 1, y: 0, z: 0 }, constant: -0.5 }
    const segments = toSegments(buildRoomGridPositions(unitPlane, 0.25, [halfSpace]))

    expect(segments).toHaveLength(8)

    segments.forEach((segment) => {
      expect(segment.start[0]).toBeGreaterThanOrEqual(0.5 - 1e-6)
      expect(segment.end[0]).toBeGreaterThanOrEqual(0.5 - 1e-6)
    })

    const horizontals = segments.filter((segment) => segment.start[1] === segment.end[1])
    expect(horizontals).toHaveLength(5)
    horizontals.forEach((segment) => {
      expect(segment.start[0]).toBeCloseTo(0.5, 10)
      expect(segment.end[0]).toBeCloseTo(1, 10)
    })
  })

  it('drops everything when two half spaces leave no room', () => {
    const positions = buildRoomGridPositions(unitPlane, 0.25, [
      { normal: { x: 1, y: 0, z: 0 }, constant: -0.9 },
      { normal: { x: -1, y: 0, z: 0 }, constant: 0.1 },
    ])

    expect(positions).toHaveLength(0)
  })

  it('keeps a segment that lies parallel to a boundary it is inside of', () => {
    const onBoundary: RoomGridHalfSpace = { normal: { x: 0, y: 1, z: 0 }, constant: 0 }
    const segments = toSegments(buildRoomGridPositions(unitPlane, 0.25, [onBoundary]))

    expect(
      segments.filter((segment) => segment.start[1] === 0 && segment.end[1] === 0),
    ).toHaveLength(1)
  })

  it('treats a plain cell size as the same step on both axes', () => {
    expect(Array.from(buildRoomGridPositions(unitPlane, 0.25))).toEqual(
      Array.from(buildRoomGridPositions(unitPlane, { acrossWidth: 0.25, acrossHeight: 0.25 })),
    )
  })

  it('steps each axis by its own spacing', () => {
    const segments = toSegments(
      buildRoomGridPositions(unitPlane, { acrossWidth: 0.25, acrossHeight: 0.5 }),
    )
    const verticals = segments.filter((segment) => segment.start[0] === segment.end[0])
    const horizontals = segments.filter((segment) => segment.start[1] === segment.end[1])

    expect(verticals.map((segment) => segment.start[0])).toEqual([0, 0.25, 0.5, 0.75, 1])
    expect(horizontals.map((segment) => segment.start[1])).toEqual([0, 0.5, 1])
  })

  it('rejects a degenerate grid', () => {
    expect(() => buildRoomGridPositions(unitPlane, 0)).toThrow(RangeError)
    expect(() => buildRoomGridPositions(unitPlane, { acrossWidth: 0.25, acrossHeight: 0 })).toThrow(
      RangeError,
    )
    expect(() =>
      buildRoomGridPositions(unitPlane, { acrossWidth: -1, acrossHeight: 0.25 }),
    ).toThrow(RangeError)
    expect(() => buildRoomGridPositions({ ...unitPlane, width: 0 }, 0.25)).toThrow(RangeError)
    expect(() => buildRoomGridPositions({ ...unitPlane, height: -1 }, 0.25)).toThrow(RangeError)
  })
})
