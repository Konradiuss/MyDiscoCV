import { describe, expect, it } from 'vitest'

import { getFarthestCornerRadius, getGradientLine } from '../components/disco/labelPatterns'

describe('css gradient geometry', () => {
  it('sends zero degrees up the screen, not along it', () => {
    const line = getGradientLine(100, 100, 0)

    expect(line.fromY).toBeCloseTo(100, 9)
    expect(line.toY).toBeCloseTo(0, 9)
    expect(line.fromX).toBeCloseTo(50, 9)
    expect(line.toX).toBeCloseTo(50, 9)
  })

  it('turns clockwise from there', () => {
    const line = getGradientLine(100, 100, 90)

    expect(line.fromX).toBeCloseTo(0, 9)
    expect(line.toX).toBeCloseTo(100, 9)
    expect(line.fromY).toBeCloseTo(50, 9)

    const diagonal = getGradientLine(100, 100, 45)
    expect(diagonal.toX).toBeGreaterThan(diagonal.fromX)
    expect(diagonal.toY).toBeLessThan(diagonal.fromY)
  })

  it('runs the line far enough for the whole box, corners included', () => {
    expect(getGradientLine(100, 200, 45).length).toBeCloseTo(
      100 * Math.sin(Math.PI / 4) + 200 * Math.cos(Math.PI / 4),
      9,
    )
    expect(getGradientLine(120, 80, 0).length).toBeCloseTo(80, 9)
    expect(getGradientLine(120, 80, 90).length).toBeCloseTo(120, 9)
  })

  it('takes a radial gradient out to its farthest corner', () => {
    expect(getFarthestCornerRadius(100, 100)).toBeCloseTo(Math.hypot(50, 50), 9)
    expect(getFarthestCornerRadius(60, 80)).toBeCloseTo(50, 9)
  })
})
