import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  clipAndSplitReflectionPolygon,
  clipAndSplitReflectionPolygonInto,
  clipPolygonToUnfoldedBounds,
  createReflectionPolygonClipWorkspace,
  intersectRayWithWalls,
  intersectRayWithWallsInto,
  splitPolygonAtCorner,
  unfoldedToWorld,
  worldToUnfolded,
  type MutableReflectionRayHit,
  type ReflectionPolygonVertex,
  type ReflectionWall,
} from '../components/disco/reflectionGeometry'

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

function vertex(s: number, y: number, u: number, v: number): ReflectionPolygonVertex {
  return { s, y, u, v }
}

function expectVectorClose(actual: THREE.Vector3, expected: THREE.Vector3) {
  expect(actual.x).toBeCloseTo(expected.x, 8)
  expect(actual.y).toBeCloseTo(expected.y, 8)
  expect(actual.z).toBeCloseTo(expected.z, 8)
}

describe('reflection wall ray intersection', () => {
  const walls = createWalls()
  const origin = new THREE.Vector3(0, 1, 0)

  it('hits the expected left wall', () => {
    const expectedPoint = walls[0].cornerOrigin
      .clone()
      .addScaledVector(walls[0].horizontal, 4)
      .addScaledVector(walls[0].vertical, 1)
    const direction = expectedPoint.clone().sub(origin).normalize()
    const hit = intersectRayWithWalls(origin, direction, walls)

    expect(hit?.wall.id).toBe('left')
    expectVectorClose(hit!.point, expectedPoint)
    expect(hit?.unfolded.s).toBeCloseTo(-4, 8)
  })

  it('hits the expected right wall', () => {
    const expectedPoint = walls[1].cornerOrigin
      .clone()
      .addScaledVector(walls[1].horizontal, 5)
      .addScaledVector(walls[1].vertical, 2)
    const direction = expectedPoint.clone().sub(origin).normalize()
    const hit = intersectRayWithWalls(origin, direction, walls)

    expect(hit?.wall.id).toBe('right')
    expectVectorClose(hit!.point, expectedPoint)
    expect(hit?.unfolded.s).toBeCloseTo(5, 8)
  })

  it('does not hit a wall when the ray leaves through the open front', () => {
    const hit = intersectRayWithWalls(origin, new THREE.Vector3(0, 0, 1), walls)

    expect(hit).toBeNull()
  })

  it('writes the closest hit into a reusable target without replacing its point', () => {
    const expectedPoint = walls[1].cornerOrigin
      .clone()
      .addScaledVector(walls[1].horizontal, 4.5)
      .addScaledVector(walls[1].vertical, 1.25)
    const direction = expectedPoint.clone().sub(origin).normalize()
    const reusablePoint = new THREE.Vector3()
    const target: MutableReflectionRayHit = {
      wall: null,
      point: reusablePoint,
      unfoldedS: 0,
      unfoldedY: 0,
      distance: 0,
    }

    expect(intersectRayWithWallsInto(origin, direction, walls, target)).toBe(true)
    expect(target.wall?.id).toBe('right')
    expect(target.point).toBe(reusablePoint)
    expectVectorClose(target.point, expectedPoint)
    expect(target.unfoldedS).toBeCloseTo(4.5, 8)
    expect(target.unfoldedY).toBeCloseTo(1.25, 8)

    expect(intersectRayWithWallsInto(origin, new THREE.Vector3(0, 0, 1), walls, target)).toBe(false)
    expect(target.wall).toBeNull()
    expect(target.distance).toBe(Number.POSITIVE_INFINITY)
    expect(target.point).toBe(reusablePoint)
  })
})

describe('wall unfolding', () => {
  const walls = createWalls()

  it.each(walls)('round-trips a point on the $id wall', (wall) => {
    const worldPoint = wall.cornerOrigin
      .clone()
      .addScaledVector(wall.horizontal, 3.75)
      .addScaledVector(wall.vertical, 1.6)
    const unfolded = worldToUnfolded(worldPoint, wall)
    const restored = unfoldedToWorld(unfolded, wall)

    expect(unfolded.s).toBeCloseTo(3.75 * wall.unfoldedSign, 8)
    expect(unfolded.y).toBeCloseTo(1.6, 8)
    expectVectorClose(restored, worldPoint)
  })
})

describe('reflection footprint clipping', () => {
  const roomBounds = {
    minS: -roomWallSpan,
    maxS: roomWallSpan,
    minY: roomFloorY,
    maxY: roomCeilingY,
  }

  it('keeps a quad that is entirely on the left wall unchanged', () => {
    const polygon = [
      vertex(-2, 0, 0, 0),
      vertex(-0.5, 0, 1, 0),
      vertex(-0.5, 1, 1, 1),
      vertex(-2, 1, 0, 1),
    ]
    const split = splitPolygonAtCorner(polygon)

    expect(split.left).toEqual(polygon)
    expect(split.right).toEqual([])
  })

  it('splits a crossing quad and interpolates matching UVs at the corner', () => {
    const polygon = [
      vertex(-1, 0, 0, 0),
      vertex(1, 0, 1, 0),
      vertex(1, 2, 1, 1),
      vertex(-1, 2, 0, 1),
    ]
    const split = splitPolygonAtCorner(polygon)
    const leftSeam = split.left.filter((item) => Math.abs(item.s) < 1e-8).sort((a, b) => a.y - b.y)
    const rightSeam = split.right
      .filter((item) => Math.abs(item.s) < 1e-8)
      .sort((a, b) => a.y - b.y)

    expect(split.left.length).toBe(4)
    expect(split.right.length).toBe(4)
    expect(leftSeam).toHaveLength(2)
    expect(rightSeam).toHaveLength(2)
    expect(leftSeam).toEqual(rightSeam)
    expect(leftSeam[0]).toEqual(vertex(0, 0, 0.5, 0))
    expect(leftSeam[1]).toEqual(vertex(0, 2, 0.5, 1))
  })

  it('reuses storage and gives both wall parts identical seam coordinates and UVs', () => {
    const polygon = [
      vertex(-1, 0, 0, 0),
      vertex(1, 0, 1, 0),
      vertex(1, 2, 1, 1),
      vertex(-1, 2, 0, 1),
    ]
    const workspace = createReflectionPolygonClipWorkspace()
    const firstLeftVertex = workspace.left[0]
    const firstRightVertex = workspace.right[0]

    expect(clipAndSplitReflectionPolygonInto(polygon, roomBounds, workspace)).toBe(true)
    expect(workspace.leftCount).toBe(4)
    expect(workspace.rightCount).toBe(4)

    const leftSeam = workspace.left
      .slice(0, workspace.leftCount)
      .filter((item) => item.s === 0)
      .sort((a, b) => a.y - b.y)
    const rightSeam = workspace.right
      .slice(0, workspace.rightCount)
      .filter((item) => item.s === 0)
      .sort((a, b) => a.y - b.y)

    expect(leftSeam).toHaveLength(2)
    expect(rightSeam).toHaveLength(2)

    for (let index = 0; index < leftSeam.length; index += 1) {
      expect(leftSeam[index]!.s).toBe(0)
      expect(rightSeam[index]!.s).toBe(0)
      expect(leftSeam[index]!.y).toBeCloseTo(rightSeam[index]!.y, 12)
      expect(leftSeam[index]!.u).toBeCloseTo(rightSeam[index]!.u, 12)
      expect(leftSeam[index]!.v).toBeCloseTo(rightSeam[index]!.v, 12)
      expect(leftSeam[index]!.u).toBeCloseTo(0.5, 12)
    }

    expect(clipAndSplitReflectionPolygonInto(polygon, roomBounds, workspace)).toBe(true)
    expect(workspace.left[0]).toBe(firstLeftVertex)
    expect(workspace.right[0]).toBe(firstRightVertex)
  })
  it('fits the worst-case clipped and split quad into the 24-vertex batch budget', () => {
    const polygon = [
      vertex(0, -10, 0.5, 0),
      vertex(10, 0, 1, 0.5),
      vertex(0, 10, 0.5, 1),
      vertex(-10, 0, 0, 0.5),
    ]
    const bounds = { minS: -6, maxS: 6, minY: -6, maxY: 6 }
    const workspace = createReflectionPolygonClipWorkspace()

    expect(clipAndSplitReflectionPolygonInto(polygon, bounds, workspace)).toBe(true)
    expect(workspace.leftCount).toBe(6)
    expect(workspace.rightCount).toBe(6)

    const triangleVertexCount =
      Math.max(0, workspace.leftCount - 2) * 3 + Math.max(0, workspace.rightCount - 2) * 3

    expect(triangleVertexCount).toBe(24)
  })
  it('clips a footprint to wall height instead of transferring it to floor or ceiling', () => {
    const epsilon = 1e-8
    const polygon = [
      vertex(-1, roomFloorY - 2, 0, 0),
      vertex(1, roomFloorY - 2, 1, 0),
      vertex(1, roomCeilingY + 2, 1, 1),
      vertex(-1, roomCeilingY + 2, 0, 1),
    ]
    const clipped = clipPolygonToUnfoldedBounds(polygon, roomBounds)
    const split = clipAndSplitReflectionPolygon(polygon, roomBounds)
    const workspace = createReflectionPolygonClipWorkspace()

    expect(clipAndSplitReflectionPolygonInto(polygon, roomBounds, workspace)).toBe(true)
    const reusableVertices = [
      ...workspace.left.slice(0, workspace.leftCount),
      ...workspace.right.slice(0, workspace.rightCount),
    ]
    expect(
      reusableVertices.every(
        (item) => item.y >= roomFloorY - epsilon && item.y <= roomCeilingY + epsilon,
      ),
    ).toBe(true)

    expect(
      clipped.every((item) => item.y >= roomFloorY - epsilon && item.y <= roomCeilingY + epsilon),
    ).toBe(true)
    expect([...split.left, ...split.right].every((item) => item.y >= roomFloorY - epsilon)).toBe(
      true,
    )
    expect([...split.left, ...split.right].every((item) => item.y <= roomCeilingY + epsilon)).toBe(
      true,
    )
  })

  it('clips a footprint to the front ends of both walls', () => {
    const polygon = [
      vertex(-roomWallSpan - 2, 0, 0, 0),
      vertex(roomWallSpan + 2, 0, 1, 0),
      vertex(roomWallSpan + 2, 1, 1, 1),
      vertex(-roomWallSpan - 2, 1, 0, 1),
    ]
    const clipped = clipPolygonToUnfoldedBounds(polygon, roomBounds)

    expect(clipped.every((item) => item.s >= -roomWallSpan && item.s <= roomWallSpan)).toBe(true)
  })
})
