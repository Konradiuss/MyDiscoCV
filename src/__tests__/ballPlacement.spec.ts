import { describe, expect, it } from 'vitest'

import {
  BALL_RADIUS,
  BALL_REST_Y,
  getBallRestY,
  PHONE_BALL_DROP,
} from '../components/disco/ballPlacement'

describe('ball placement', () => {
  it('leaves a roomy screen alone', () => {
    expect(getBallRestY(false)).toBe(BALL_REST_Y)
  })

  it('drops the ball on a phone, and only by the stated amount', () => {
    expect(getBallRestY(true)).toBeCloseTo(BALL_REST_Y - PHONE_BALL_DROP, 10)
    expect(getBallRestY(true)).toBeLessThan(getBallRestY(false))
  })

  /*
   * A nudge clear of the corner controls, not a flight from them: past about a
   * quarter of a unit the ball starts crowding the visitor's name.
   */
  it('keeps the drop small enough to stay a nudge', () => {
    expect(PHONE_BALL_DROP).toBeGreaterThan(0)
    expect(PHONE_BALL_DROP).toBeLessThan(0.25)
  })

  it('still clears the room floor by a comfortable margin', () => {
    const roomFloorY = -2.7
    expect(getBallRestY(true) - BALL_RADIUS).toBeGreaterThan(roomFloorY + 1)
  })
})
