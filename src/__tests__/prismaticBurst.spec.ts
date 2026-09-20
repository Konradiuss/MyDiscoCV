import { describe, expect, it } from 'vitest'

import {
  BURST_QUAD_SEGMENTS,
  PRISMATIC_BURST_FRAGMENT_SHADER,
  PRISMATIC_BURST_VERTEX_SHADER,
  createPrismaticBurstGeometry,
  createPrismaticBurstMaterial,
  getBurstQuadTransform,
  getBurstReach,
  isBurstQuadOnScreen,
} from '../components/disco/prismaticBurst'

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

describe('skipping the burst it cannot see', () => {
  const quad = (centerX: number, centerY: number, half = 0.5) => ({
    centerX,
    centerY,
    halfWidth: half,
    halfHeight: half,
  })

  it('draws a halo sitting over the middle of the screen', () => {
    expect(isBurstQuadOnScreen(quad(0, 0))).toBe(true)
  })

  it('draws a halo the screen only clips a corner of', () => {
    expect(isBurstQuadOnScreen(quad(1.4, 1.4))).toBe(true)
  })

  it('still draws a halo whose edge lands exactly on the border', () => {
    expect(isBurstQuadOnScreen(quad(1.5, 0))).toBe(true)
    expect(isBurstQuadOnScreen(quad(0, -1.5))).toBe(true)
  })

  it('skips a halo that has scrolled off the top, which is how it leaves', () => {
    expect(isBurstQuadOnScreen(quad(0, 1.6))).toBe(false)
  })

  it('skips a halo off any other edge', () => {
    expect(isBurstQuadOnScreen(quad(-1.6, 0))).toBe(false)
    expect(isBurstQuadOnScreen(quad(1.6, 0))).toBe(false)
    expect(isBurstQuadOnScreen(quad(0, -1.6))).toBe(false)
  })

  it('keeps a halo far off-centre while it is wide enough to reach back', () => {
    expect(isBurstQuadOnScreen(quad(4, 0, 3.5))).toBe(true)
  })

  it('agrees with the quad the placement actually produces as the ball leaves', () => {
    const leaving = getBurstQuadTransform({ ...ball, centerY: -2600 }, view, 400)!

    expect(isBurstQuadOnScreen(leaving)).toBe(false)
  })
})

describe('the shape the halo is drawn on', () => {
  const positions = () => {
    const array = createPrismaticBurstGeometry().getAttribute('position').array
    const points: [number, number][] = []
    for (let i = 0; i < array.length; i += 3) points.push([array[i]!, array[i + 1]!])
    return points
  }

  it('covers the whole disc the shader keeps', () => {
    // Every edge midpoint is the closest a circumscribed polygon comes to the
    // rim; if those clear it, nothing of the halo is cut off.
    const rim = positions().filter(([x, y]) => Math.hypot(x, y) > 0.5)

    rim.forEach(([x, y], index) => {
      const next = rim[(index + 1) % rim.length]!
      const midX = (x + next[0]) / 2
      const midY = (y + next[1]) / 2

      expect(Math.hypot(midX, midY)).toBeGreaterThanOrEqual(1)
    })
  })

  it('wastes less of the screen than the square it replaces', () => {
    const reach = Math.max(...positions().map(([x, y]) => Math.hypot(x, y)))
    const polygon = BURST_QUAD_SEGMENTS * Math.tan(Math.PI / BURST_QUAD_SEGMENTS)

    expect(reach).toBeLessThan(1.05)
    expect(polygon).toBeLessThan(4 * 0.85)
  })
})

describe('the burst shader', () => {
  it('leaves the march before the light it would add has run out', () => {
    const marchStart = PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('for ( int i = 0;')
    const breakOut = PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('if ( rad >= 5.0 ) break;')

    expect(marchStart).toBeGreaterThan(-1)
    expect(breakOut).toBeGreaterThan(marchStart)
  })

  it('declares every uniform it reads', () => {
    const declared = new Set(
      [...PRISMATIC_BURST_FRAGMENT_SHADER.matchAll(/uniform\s+\w+\s+(u\w+)\s*;/g)].map(
        (match) => match[1]!,
      ),
    )
    const provided = new Set(Object.keys(createPrismaticBurstMaterial({ steps: 8 }).uniforms))

    declared.forEach((name) => expect(provided).toContain(name))
  })

  it('carries no uniform the shaders never read', () => {
    const source = PRISMATIC_BURST_VERTEX_SHADER + PRISMATIC_BURST_FRAGMENT_SHADER
    const provided = Object.keys(createPrismaticBurstMaterial({ steps: 8 }).uniforms)

    provided.forEach((name) =>
      expect(new RegExp(`uniform\\s+\\w+\\s+${name}\\s*;`).test(source)).toBe(true),
    )
  })
})

describe('the cheap halo', () => {
  it('marches unless asked not to', () => {
    expect(createPrismaticBurstMaterial({ steps: 20 }).defines.BURST_CHEAP).toBeUndefined()
    expect(
      createPrismaticBurstMaterial({ steps: 20, mode: 'march' }).defines.BURST_CHEAP,
    ).toBeUndefined()
  })

  it('switches the shader over on the glow setting', () => {
    const defines = createPrismaticBurstMaterial({ steps: 20, mode: 'glow' }).defines

    expect(defines.BURST_CHEAP).toBeDefined()
    expect(defines.BURST_CHEAP_GAIN).toBeDefined()
  })

  /*
   * Both branches live in one shader source on purpose: the two contract tests
   * above read that source for uniform declarations, and a second shader file
   * would leave every march-only uniform looking unused.
   */
  it('keeps the march behind the cheap branch rather than in its own shader', () => {
    const cheap = PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('#ifdef BURST_CHEAP')
    const march = PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('for ( int i = 0;')
    const otherwise = PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('#else', cheap)

    expect(cheap).toBeGreaterThan(-1)
    expect(otherwise).toBeGreaterThan(cheap)
    expect(march).toBeGreaterThan(otherwise)
  })

  /*
   * The two things that make the cheap halo read as light coming off the ball
   * rather than a gradient pasted over it: the palette the march uses, and the
   * ball's own rotation. Losing either is a silent downgrade, so they are nailed
   * down here.
   */
  it('turns with the ball and keeps the march palette', () => {
    const branch = PRISMATIC_BURST_FRAGMENT_SHADER.slice(
      PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('#ifdef BURST_CHEAP'),
      PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('for ( int i = 0;'),
    )

    expect(branch).toContain('uAngle')
    expect(branch).toContain('sampleGradient')
  })

  it('leaves the five-octave grain to the march', () => {
    const cheapBranch = PRISMATIC_BURST_FRAGMENT_SHADER.slice(
      PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('#ifdef BURST_CHEAP'),
      PRISMATIC_BURST_FRAGMENT_SHADER.indexOf('#else'),
    )

    expect(cheapBranch).not.toContain('layeredNoise')
  })
})
