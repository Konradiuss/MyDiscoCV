import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { getBallScreenGeometry, getObjectScreenRect } from '../components/disco/ballProjection'
import { BALL_RADIUS, getBallRestY } from '../components/disco/ballPlacement'

/* Imported, not copied: a local 1.88 would go on testing a ball that moved. */
const BALL_CENTER = new THREE.Vector3(0, getBallRestY(false), 0)
const PHONE_BALL_CENTER = new THREE.Vector3(0, getBallRestY(true), 0)

function createCamera(fov: number, width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100)
  camera.position.set(0, 0.08, 5.7)
  camera.lookAt(0, 0.78, -0.45)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

function viewOf(width: number, height: number, left = 0, top = 0) {
  return { left, top, width, height }
}

describe('ball screen projection', () => {
  it('measures the shipped ball as clearly smaller than its pointer target', () => {
    const ball = getBallScreenGeometry(
      createCamera(35, 1440, 900),
      BALL_CENTER,
      BALL_RADIUS,
      viewOf(1440, 900),
    )

    expect(ball).not.toBeNull()
    expect(ball!.diameter).toBeGreaterThan(230)
    expect(ball!.diameter).toBeLessThan(245)
    expect(ball!.centerX).toBeCloseTo(720, 6)
  })

  it('does not track the pointer target across tiers', () => {
    const desktop = getBallScreenGeometry(
      createCamera(35, 1440, 900),
      BALL_CENTER,
      BALL_RADIUS,
      viewOf(1440, 900),
    )!
    // The phone ball hangs lower, so this is the centre it really has there.
    const mobile = getBallScreenGeometry(
      createCamera(31, 390, 844),
      PHONE_BALL_CENTER,
      BALL_RADIUS,
      viewOf(390, 844),
    )!

    expect(desktop.diameter).toBeLessThan(280)
    expect(mobile.diameter).toBeGreaterThan(230)
  })

  /*
   * The whole point of the drop: on a phone the ball has to sit lower on screen
   * than it would at the desktop resting height, and by a visible amount.
   */
  it('puts the phone ball lower down the screen than the resting height would', () => {
    const camera = createCamera(31, 390, 844)
    const view = viewOf(390, 844)

    const resting = getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, view)!
    const dropped = getBallScreenGeometry(camera, PHONE_BALL_CENTER, BALL_RADIUS, view)!

    expect(dropped.centerY).toBeGreaterThan(resting.centerY + 20)
    expect(dropped.centerX).toBeCloseTo(resting.centerX, 6)
  })

  it('is larger than a naive on-axis estimate, because the ball sits off axis', () => {
    const height = 900
    const fov = 35
    const distance = BALL_CENTER.distanceTo(new THREE.Vector3(0, 0.08, 5.7))
    const naive = (BALL_RADIUS / distance / Math.tan((fov * Math.PI) / 360)) * (height / 2) * 2

    const ball = getBallScreenGeometry(
      createCamera(fov, 1440, height),
      BALL_CENTER,
      BALL_RADIUS,
      viewOf(1440, height),
    )!

    expect(ball.diameter).toBeGreaterThan(naive)
    expect(ball.diameter / naive).toBeLessThan(1.06)
  })

  it('puts the centre on the outline, not on the projected sphere centre', () => {
    const camera = createCamera(35, 1440, 900)
    const ball = getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, viewOf(1440, 900))!

    const projected = BALL_CENTER.clone().project(camera)
    const sphereCentreY = (-projected.y * 0.5 + 0.5) * 900

    expect(Math.abs(ball.centerY - sphereCentreY)).toBeGreaterThan(1)
    expect(Math.abs(ball.centerY - sphereCentreY)).toBeLessThan(6)
  })

  it('follows the canvas box rather than the viewport', () => {
    const camera = createCamera(35, 1440, 900)
    const full = getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, viewOf(1440, 900))!
    const narrowed = getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, viewOf(1425, 900))!

    expect(full.centerX - narrowed.centerX).toBeCloseTo(7.5, 6)
  })

  it('offsets by the canvas position on screen', () => {
    const camera = createCamera(35, 1440, 900)
    const base = getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, viewOf(1440, 900))!
    const moved = getBallScreenGeometry(
      camera,
      BALL_CENTER,
      BALL_RADIUS,
      viewOf(1440, 900, 30, 12),
    )!

    expect(moved.centerX - base.centerX).toBeCloseTo(30, 6)
    expect(moved.centerY - base.centerY).toBeCloseTo(12, 6)
  })

  it('scales with viewport height', () => {
    const small = getBallScreenGeometry(
      createCamera(35, 1440, 900),
      BALL_CENTER,
      BALL_RADIUS,
      viewOf(1440, 900),
    )!
    const tall = getBallScreenGeometry(
      createCamera(35, 1440, 1800),
      BALL_CENTER,
      BALL_RADIUS,
      viewOf(1440, 1800),
    )!

    expect(tall.diameter / small.diameter).toBeGreaterThan(1.9)
    expect(tall.diameter / small.diameter).toBeLessThan(2.1)
  })

  it('refuses to guess when there is nothing to measure', () => {
    const camera = createCamera(35, 1440, 900)

    expect(getBallScreenGeometry(camera, BALL_CENTER, 0, viewOf(1440, 900))).toBeNull()
    expect(getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, viewOf(0, 900))).toBeNull()
    expect(getBallScreenGeometry(camera, BALL_CENTER, BALL_RADIUS, viewOf(1440, 0))).toBeNull()
    expect(
      getBallScreenGeometry(camera, camera.position.clone(), BALL_RADIUS, viewOf(1440, 900)),
    ).toBeNull()
  })
})

describe('screen box of a mesh', () => {
  function straightCamera() {
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    return camera
  }

  function meshAt(size: [number, number, number], at: [number, number, number], turn = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size))
    mesh.position.set(...at)
    mesh.rotation.y = turn
    mesh.updateMatrixWorld(true)
    return mesh
  }

  it('measures a flat square against what the lens says it should be', () => {
    const rect = getObjectScreenRect(
      straightCamera(),
      meshAt([1, 1, 0], [0, 0, 0]),
      viewOf(1000, 1000),
    )!

    expect(rect.width).toBeCloseTo(100, 6)
    expect(rect.height).toBeCloseTo(100, 6)
    expect(rect.left + rect.width / 2).toBeCloseTo(500, 6)
    expect(rect.top + rect.height / 2).toBeCloseTo(500, 6)
  })

  it('boxes a turned mesh by itself and not by its bounding box', () => {
    const camera = straightCamera()
    const view = viewOf(1000, 1000)
    const square = getObjectScreenRect(camera, meshAt([1, 1, 0], [0, 0, 0]), view)!
    const turned = getObjectScreenRect(camera, meshAt([1, 1, 0], [0, 0, 0], Math.PI / 4), view)!

    expect(turned.width).toBeLessThan(square.width)
    expect(turned.width).toBeGreaterThan(square.width * 0.7)
    expect(turned.height).toBeGreaterThan(square.height)
  })

  it('grows what stands nearer the camera', () => {
    const camera = straightCamera()
    const view = viewOf(1000, 1000)
    const far = getObjectScreenRect(camera, meshAt([1, 1, 0], [0, 0, 0]), view)!
    const near = getObjectScreenRect(camera, meshAt([1, 1, 0], [0, 0, 2.5]), view)!

    expect(near.width).toBeGreaterThan(far.width * 1.9)
  })

  it('gives back nothing for anything behind the camera', () => {
    expect(
      getObjectScreenRect(straightCamera(), meshAt([1, 1, 1], [0, 0, 9]), viewOf(1000, 1000)),
    ).toBeNull()
  })

  it('gives back nothing where there is no view to project into', () => {
    expect(
      getObjectScreenRect(straightCamera(), meshAt([1, 1, 1], [0, 0, 0]), viewOf(0, 0)),
    ).toBeNull()
  })
})
