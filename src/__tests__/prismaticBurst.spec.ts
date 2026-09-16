import { describe, expect, it } from 'vitest'

import { getBurstQuadTransform, getBurstReach } from '../components/disco/prismaticBurst'

const view = { left: 0, top: 0, width: 1200, height: 800 }
const ball = { centerX: 600, centerY: 200, diameter: 260 }

describe('prismatic burst placement', () => {
  it('reaches out from the ball by a share of the viewport height', () => {
    expect(getBurstReach(ball, view, 0.34)).toBeCloseTo(130 + 272, 5)
  })

  it('ignores the viewport width, which a phone has almost none of', () => {
    const phone = { left: 0, top: 0, width: 390, height: 800 }

    expect(getBurstReach(ball, phone, 0.34)).toBeCloseTo(getBurstReach(ball, view, 0.34), 5)
  })

  it('grows the halo with the ball it belongs to', () => {
    const bigger = { ...ball, diameter: 400 }

    expect(getBurstReach(bigger, view, 0.34) - getBurstReach(ball, view, 0.34)).toBeCloseTo(70, 5)
  })

  it('centres the quad on the ball in normalized device coordinates', () => {
    const quad = getBurstQuadTransform(ball, view, 400)!

    expect(quad.centerX).toBeCloseTo(0, 5)
    expect(quad.centerY).toBeCloseTo(0.5, 5)
  })

  it('sizes the quad to the reach on both axes', () => {
    const quad = getBurstQuadTransform(ball, view, 400)!

    expect(quad.halfWidth).toBeCloseTo((400 / 1200) * 2, 5)
    expect(quad.halfHeight).toBeCloseTo((400 / 800) * 2, 5)
  })

  it('measures from the canvas box rather than from the page', () => {
    const offsetView = { left: 40, top: 25, width: 1200, height: 800 }
    const quad = getBurstQuadTransform({ ...ball, centerX: 640, centerY: 225 }, offsetView, 400)!

    expect(quad.centerX).toBeCloseTo(0, 5)
    expect(quad.centerY).toBeCloseTo(0.5, 5)
  })

  it('lets the quad hang past the top edge when the ball is leaving', () => {
    const quad = getBurstQuadTransform({ ...ball, centerY: -80 }, view, 400)!

    expect(quad.centerY).toBeGreaterThan(1)
    expect(quad.centerY + quad.halfHeight).toBeGreaterThan(1)
  })

  it('has nothing to place in a viewport with no area', () => {
    expect(getBurstQuadTransform(ball, { left: 0, top: 0, width: 0, height: 800 }, 400)).toBeNull()
    expect(getBurstQuadTransform(ball, { left: 0, top: 0, width: 1200, height: 0 }, 400)).toBeNull()
    expect(getBurstQuadTransform(ball, view, 0)).toBeNull()
  })
})
