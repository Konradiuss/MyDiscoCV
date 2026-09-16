import { describe, expect, it } from 'vitest'

import {
  createClickSparkBurst,
  easeClickSpark,
  getClickSparkLine,
  isClickSparkDrag,
} from '../components/effects/clickSpark'

describe('click spark easing', () => {
  it('uses the ease-out curve from the visual reference', () => {
    expect(easeClickSpark(0, 'ease-out')).toBe(0)
    expect(easeClickSpark(0.5, 'ease-out')).toBe(0.75)
    expect(easeClickSpark(1, 'ease-out')).toBe(1)
  })

  it('keeps invalid progress inside the animation range', () => {
    expect(easeClickSpark(-1, 'linear')).toBe(0)
    expect(easeClickSpark(2, 'linear')).toBe(1)
    expect(easeClickSpark(Number.NaN, 'linear')).toBe(0)
  })
})

describe('click spark burst', () => {
  it('places a stable ring of sparks around the click', () => {
    const sparks = createClickSparkBurst(24, 36, 100, 4)

    expect(sparks).toHaveLength(4)
    expect(sparks.map((spark) => spark.angle)).toEqual([0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2])
  })

  it('drops bursts that cannot be drawn', () => {
    expect(createClickSparkBurst(Number.NaN, 36, 100, 4)).toEqual([])
    expect(createClickSparkBurst(24, 36, 100, 0)).toEqual([])
  })
})

describe('click spark drag', () => {
  it('keeps a still pointer eligible for a click spark', () => {
    expect(isClickSparkDrag(10, 20, 10, 20)).toBe(false)
    expect(isClickSparkDrag(10, 20, 16, 20)).toBe(false)
  })

  it('marks pointer movement past the tolerance as a drag', () => {
    expect(isClickSparkDrag(10, 20, 17, 20)).toBe(true)
    expect(isClickSparkDrag(10, 20, 14, 25)).toBe(true)
  })
})
describe('click spark line', () => {
  const spark = createClickSparkBurst(10, 20, 100, 1)[0]!
  const options = {
    sparkSize: 10,
    sparkRadius: 20,
    duration: 400,
    extraScale: 1,
    easing: 'linear' as const,
  }

  it('moves outward while shrinking the line', () => {
    expect(getClickSparkLine(spark, 100, options)).toEqual({
      x1: 10,
      y1: 20,
      x2: 20,
      y2: 20,
      alpha: 1,
    })

    expect(getClickSparkLine(spark, 300, options)).toEqual({
      x1: 20,
      y1: 20,
      x2: 25,
      y2: 20,
      alpha: 0.5,
    })
  })

  it('disappears when its duration is over', () => {
    expect(getClickSparkLine(spark, 500, options)).toBeNull()
  })
})
