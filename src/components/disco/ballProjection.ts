import * as THREE from 'three'

export interface BallScreenGeometry {
  readonly centerX: number
  readonly centerY: number
  readonly diameter: number
}

export interface ScreenRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/*
 * How many points around the silhouette are projected to find the ball's box on
 * screen. This runs every frame to size the halo, so it is worth lowering where
 * the frames are scarce — a 16-gon's box differs from a 64-gon's by under 2% of
 * the radius, about two pixels at the size the ball is ever drawn. It stays at
 * 64 by default so the full-quality room is bit-for-bit what it always was.
 */
const SILHOUETTE_SAMPLES = 64

const ringCenter = new THREE.Vector3()
const ringAxis = new THREE.Vector3()
const ringU = new THREE.Vector3()
const ringV = new THREE.Vector3()
const ringPoint = new THREE.Vector3()

export function getBallScreenGeometry(
  camera: THREE.PerspectiveCamera,
  center: THREE.Vector3,
  radius: number,
  view: ScreenRect,
  samples: number = SILHOUETTE_SAMPLES,
): BallScreenGeometry | null {
  if (!(radius > 0) || !(view.width > 0) || !(view.height > 0)) return null

  const distance = center.distanceTo(camera.position)
  if (!(distance > radius)) return null

  ringAxis.copy(center).sub(camera.position).divideScalar(distance)
  ringCenter.copy(center).addScaledVector(ringAxis, -(radius * radius) / distance)
  const ringRadius = (radius * Math.sqrt(distance * distance - radius * radius)) / distance

  ringU.set(0, 1, 0).cross(ringAxis)
  if (ringU.lengthSq() < 1e-8) ringU.set(1, 0, 0).cross(ringAxis)
  ringU.normalize()
  ringV.copy(ringAxis).cross(ringU).normalize()

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let index = 0; index < samples; index += 1) {
    const angle = (index / samples) * Math.PI * 2
    ringPoint
      .copy(ringCenter)
      .addScaledVector(ringU, Math.cos(angle) * ringRadius)
      .addScaledVector(ringV, Math.sin(angle) * ringRadius)
      .project(camera)

    const x = view.left + (ringPoint.x * 0.5 + 0.5) * view.width
    const y = view.top + (-ringPoint.y * 0.5 + 0.5) * view.height
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    diameter: (maxX - minX + (maxY - minY)) / 2,
  }
}

const boxCorner = new THREE.Vector3()
const boxCameraSpace = new THREE.Vector3()
const BOX_CORNER_SIGNS: readonly (readonly [number, number, number])[] = [
  [-1, -1, -1],
  [1, -1, -1],
  [-1, 1, -1],
  [1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [-1, 1, 1],
  [1, 1, 1],
]

export function getObjectScreenRect(
  camera: THREE.PerspectiveCamera,
  object: THREE.Mesh,
  view: ScreenRect,
): ScreenRect | null {
  if (!(view.width > 0) || !(view.height > 0)) return null

  const geometry = object.geometry
  if (!geometry.boundingBox) geometry.computeBoundingBox()

  const box = geometry.boundingBox
  if (!box) return null

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const [signX, signY, signZ] of BOX_CORNER_SIGNS) {
    boxCorner.set(
      signX < 0 ? box.min.x : box.max.x,
      signY < 0 ? box.min.y : box.max.y,
      signZ < 0 ? box.min.z : box.max.z,
    )
    boxCorner.applyMatrix4(object.matrixWorld)

    boxCameraSpace.copy(boxCorner).applyMatrix4(camera.matrixWorldInverse)
    if (boxCameraSpace.z >= 0) return null

    boxCorner.project(camera)

    const x = view.left + (boxCorner.x * 0.5 + 0.5) * view.width
    const y = view.top + (-boxCorner.y * 0.5 + 0.5) * view.height
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
}
