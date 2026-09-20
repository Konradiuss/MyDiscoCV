/**
 * How the top of the page is composed.
 *
 * The room is drawn through a camera whose field of view is vertical, so the
 * ball's size on screen is a share of the window's *height*. A phone lying on
 * its side has almost no height — 390 pixels — and the ball came out at 99,
 * against 229 on a desktop and 244 held upright. Hence "мизерный".
 *
 * Zooming in on its own does not fix it. The ball hangs above the line the
 * camera looks along, and a narrower lens magnifies that offset together with
 * everything else: at the zoom that makes the ball 150px, its centre lands on
 * the thirteenth row of pixels and half of it is off the top of the screen. So
 * the zoom has to travel with a drop, and the two are decided here together.
 *
 * Nothing above `shortViewportHeight()` is touched: a desktop, a tablet and a
 * phone held upright all come back with exactly the numbers they had before
 * this file existed.
 */

import * as THREE from 'three'

import { BALL_RADIUS, BALL_REST_Y, getBallRestY } from './ballPlacement'

/**
 * Where the visitor stands while reading the page, and what they look at.
 *
 * These used to live in the scene component. The framing cannot be worked out
 * without them, and a second copy of a number is how the ball's height went
 * wrong the last time, so the component imports them from here instead.
 */
export const PAGE_VIEW_CAMERA = { y: 0.08, z: 5.7 } as const
export const PAGE_VIEW_TARGET = { y: 0.78, z: -0.45 } as const

/** The lens on a window with room to spare, by width. Unchanged from always. */
const DESKTOP_FOV = 35
const PHONE_FOV = 31

/**
 * The ball is never drawn smaller than this. Below the height where the plain
 * lens already fails to manage it, the room zooms in rather than let it shrink.
 */
const MIN_BALL_PIXELS = 150

/** By the height of a phone lying on its side, the ball is dead centre. */
const CENTRED_HEIGHT = 430

/**
 * The height at which the ball sits exactly on the line of sight, which is what
 * "centred in the frame" means — and, usefully, it does not depend on the lens
 * at all, so it can be solved outright instead of searched for.
 *
 * The camera looks from PAGE_VIEW_CAMERA towards PAGE_VIEW_TARGET; the ball
 * stands at z = 0, so this is that line evaluated there.
 */
export const CENTRED_BALL_Y =
  PAGE_VIEW_CAMERA.y +
  (PAGE_VIEW_CAMERA.z * (PAGE_VIEW_TARGET.y - PAGE_VIEW_CAMERA.y)) /
    (PAGE_VIEW_CAMERA.z - PAGE_VIEW_TARGET.z)

export interface HeroFraming {
  /** Vertical field of view, in degrees, for the page view. */
  readonly fov: number
  /** Where the ball hangs, in world units above the room's centre. */
  readonly ballRestY: number
}

function ballDistance(restY: number) {
  return Math.hypot(restY - PAGE_VIEW_CAMERA.y, PAGE_VIEW_CAMERA.z)
}

/**
 * The height below which the framing starts to move: the one at which this lens
 * already draws the ball at exactly MIN_BALL_PIXELS.
 *
 * Deriving it rather than writing it down is what makes the change seamless —
 * both the drop and the zoom begin at the same height by construction, so there
 * is nothing to line up by hand and no step to fall down when a window is
 * dragged across it.
 */
function shortViewportHeight(baseFov: number) {
  return (
    (MIN_BALL_PIXELS *
      ballDistance(BALL_REST_Y) *
      Math.tan(THREE.MathUtils.degToRad(baseFov / 2))) /
    BALL_RADIUS
  )
}

export function getHeroFraming(narrow: boolean, height: number): HeroFraming {
  const baseFov = narrow ? PHONE_FOV : DESKTOP_FOV
  const restY = getBallRestY(narrow)
  const short = shortViewportHeight(baseFov)

  if (!(height > 0) || height >= short) return { fov: baseFov, ballRestY: restY }

  // 0 once the window is as short as a phone on its side, 1 where the framing
  // is still the ordinary one — so it reads as how much headroom is left.
  const headroom = THREE.MathUtils.smoothstep(height, CENTRED_HEIGHT, short)
  const ballRestY = THREE.MathUtils.lerp(CENTRED_BALL_Y, restY, headroom)

  const halfAngle = Math.atan((BALL_RADIUS * height) / (ballDistance(ballRestY) * MIN_BALL_PIXELS))

  return { fov: Math.min(baseFov, THREE.MathUtils.radToDeg(halfAngle) * 2), ballRestY }
}
