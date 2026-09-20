import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { BALL_RADIUS, getBallRestY } from '../components/disco/ballPlacement'
import { getBallScreenGeometry } from '../components/disco/ballProjection'
import {
  CENTRED_BALL_Y,
  getHeroFraming,
  PAGE_VIEW_CAMERA,
  PAGE_VIEW_TARGET,
} from '../components/disco/heroFraming'

/** The room as the component builds it, so the numbers here are the shipped ones. */
function ballOnScreen(width: number, height: number, narrow = width < 720) {
  const framing = getHeroFraming(narrow, height)

  const camera = new THREE.PerspectiveCamera(framing.fov, width / height, 0.1, 100)
  camera.position.set(0, PAGE_VIEW_CAMERA.y, PAGE_VIEW_CAMERA.z)
  camera.lookAt(0, PAGE_VIEW_TARGET.y, PAGE_VIEW_TARGET.z)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()

  const ball = getBallScreenGeometry(
    camera,
    new THREE.Vector3(0, framing.ballRestY, 0),
    BALL_RADIUS,
    { left: 0, top: 0, width, height },
  )!

  return { ...framing, ...ball }
}

describe('framing a window with room to spare', () => {
  /*
   * The owner's standing condition is that nothing changes where nothing is
   * wrong. These are the four windows that matter, written down so that anyone
   * touching the short-window rule has to come here and say so on purpose.
   */
  it.each([
    ['a desktop', 1440, 900, 35],
    ['a laptop', 1280, 720, 35],
    ['a tablet upright', 768, 1024, 35],
    ['a phone upright', 390, 844, 31],
    ['the smallest phone', 320, 640, 31],
  ])('leaves %s exactly as it was', (_label, width, height, fov) => {
    const narrow = width < 720
    const framing = getHeroFraming(narrow, height)

    expect(framing.fov).toBe(fov)
    expect(framing.ballRestY).toBe(getBallRestY(narrow))
  })
})

describe('framing a window with no height', () => {
  it('draws the ball far bigger than the plain lens would', () => {
    const before = ballOnScreen(844, 390, false).diameter
    const framing = getHeroFraming(false, 390)

    expect(framing.fov).toBeLessThan(26)
    expect(before).toBeGreaterThan(145)

    // What it used to be: the desktop lens in a 390px-tall window.
    expect(framing.fov).toBeLessThan(35)
  })

  it('puts the ball in the middle of the frame, not against the top edge', () => {
    const ball = ballOnScreen(844, 390)

    // Within a few pixels: the measured centre is the outline's, not the sphere's.
    expect(ball.centerY).toBeGreaterThan(390 / 2 - 6)
    expect(ball.centerY).toBeLessThan(390 / 2 + 6)
    expect(ball.centerX).toBeCloseTo(422, 6)
  })

  it('hangs the ball on the line of sight once the window is short enough', () => {
    expect(getHeroFraming(false, 430).ballRestY).toBeCloseTo(CENTRED_BALL_Y, 6)
    expect(getHeroFraming(false, 320).ballRestY).toBeCloseTo(CENTRED_BALL_Y, 6)
  })
})

describe('every window between a phone on its side and a desktop', () => {
  const heights = Array.from({ length: 59 }, (_value, step) => 320 + step * 10)

  /*
   * The point of the whole exercise. A narrower lens magnifies the ball's
   * offset from the line of sight along with everything else, so zooming in
   * without dropping the ball walks it off the top of the screen — which is
   * why the two are decided together and checked together here.
   */
  it.each(heights)('keeps the whole ball on screen at %ipx tall', (height) => {
    const ball = ballOnScreen(844, height, false)

    expect(ball.centerY - ball.diameter / 2).toBeGreaterThan(0)
    expect(ball.centerY + ball.diameter / 2).toBeLessThan(height)
  })

  it.each(heights)('never draws the ball smaller than 150px at %ipx tall', (height) => {
    expect(ballOnScreen(844, height, false).diameter).toBeGreaterThan(149)
  })

  it('does the same in the narrow windows, where the lens starts different', () => {
    for (const height of heights) {
      const ball = ballOnScreen(390, height, true)

      expect(ball.centerY - ball.diameter / 2).toBeGreaterThan(0)
      expect(ball.diameter).toBeGreaterThan(149)
    }
  })

  /*
   * Dragging a window across the threshold must not make the room jump. Both
   * rules start at the height where the plain lens itself reaches 150px, so
   * there is nothing to line up by hand — this is that promise measured.
   */
  it('changes without a step where the rule takes over', () => {
    for (const height of [560, 575, 585, 588, 589, 590, 591, 600, 620]) {
      const here = getHeroFraming(false, height)
      const next = getHeroFraming(false, height + 1)

      expect(Math.abs(next.fov - here.fov)).toBeLessThan(0.1)
      expect(Math.abs(next.ballRestY - here.ballRestY)).toBeLessThan(0.02)
    }
  })

  it('only ever zooms in, and only ever lowers the ball', () => {
    for (const height of heights) {
      const framing = getHeroFraming(false, height)

      expect(framing.fov).toBeLessThanOrEqual(35)
      expect(framing.ballRestY).toBeLessThanOrEqual(getBallRestY(false))
    }
  })
})

describe('a window with no size at all', () => {
  it('falls back to the plain lens rather than dividing by nothing', () => {
    expect(getHeroFraming(false, 0).fov).toBe(35)
    expect(getHeroFraming(true, -1).fov).toBe(31)
  })
})
