/**
 * Where the disco ball hangs.
 *
 * Its resting height used to be a lone constant inside the scene component, with
 * the same number written out again for the reflection anchor and a third and
 * fourth time in CSS pixels — the drag target and the loading screen's fallback.
 * Those pixel copies cannot be imported from here, but at least the world-space
 * truth now has one home, and the test that projects the ball reads it instead
 * of carrying its own copy of 1.88.
 */

/** World units above the room's centre, on a screen with room to spare. */
export const BALL_REST_Y = 1.88

export const BALL_RADIUS = 0.48

/**
 * How far the ball drops on a phone.
 *
 * The controls in the top corner stack two keys by two there and stand about
 * 136px tall, which covers the top of the ball. Clearing it outright would take
 * some 150px and push the ball into the visitor's name; this is a nudge, not a
 * rescue. At the phone field of view 0.1 world units is roughly 25 screen
 * pixels, so this is about 40.
 *
 * Mirrored in CSS as the `top` of `.disco-ball-hit-area` and
 * `.disco-room-fallback__ball` under `@media (max-width: 720px)`, and in
 * `FALLBACK_BALL.mobile` in src/loading/loadingScreen.ts. Move one, move all.
 */
export const PHONE_BALL_DROP = 0.16

export function getBallRestY(narrow: boolean) {
  return narrow ? BALL_REST_Y - PHONE_BALL_DROP : BALL_REST_Y
}
