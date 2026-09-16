import { describe, expect, it } from 'vitest'

import {
  VOLUME_DRAG_RANGE,
  clampVolumePercent,
  getDraggedVolume,
  getSteppedVolume,
} from '../components/controls/volumeControl'

describe('holding the volume to whole per cent', () => {
  it('rounds and keeps it inside the range', () => {
    expect(clampVolumePercent(68.6)).toBe(69)
    expect(clampVolumePercent(140)).toBe(100)
    expect(clampVolumePercent(-8)).toBe(0)
  })

  it('reads nothing at all as silence', () => {
    expect(clampVolumePercent(Number.NaN)).toBe(0)
  })
})

describe('dragging the wheel', () => {
  it('goes louder upward and quieter downward', () => {
    expect(getDraggedVolume(50, -VOLUME_DRAG_RANGE / 4)).toBeGreaterThan(50)
    expect(getDraggedVolume(50, VOLUME_DRAG_RANGE / 4)).toBeLessThan(50)
  })

  it('covers the whole range in one pull of the stated length', () => {
    expect(getDraggedVolume(0, -VOLUME_DRAG_RANGE)).toBe(100)
    expect(getDraggedVolume(100, VOLUME_DRAG_RANGE)).toBe(0)
  })

  it('moves by the fraction of the pull that was made', () => {
    expect(getDraggedVolume(20, -VOLUME_DRAG_RANGE / 2)).toBe(70)
  })

  it('stops at the ends however far the drag goes on', () => {
    expect(getDraggedVolume(90, -VOLUME_DRAG_RANGE * 5)).toBe(100)
    expect(getDraggedVolume(10, VOLUME_DRAG_RANGE * 5)).toBe(0)
  })

  it('leaves the volume alone when nothing has moved', () => {
    expect(getDraggedVolume(69, 0)).toBe(69)
  })
})

describe('stepping the volume with a key', () => {
  it('answers both pairs of arrows, louder up and right', () => {
    expect(getSteppedVolume(50, 'ArrowUp')).toBe(51)
    expect(getSteppedVolume(50, 'ArrowRight')).toBe(51)
    expect(getSteppedVolume(50, 'ArrowDown')).toBe(49)
    expect(getSteppedVolume(50, 'ArrowLeft')).toBe(49)
  })

  it('moves by a page on the page keys', () => {
    expect(getSteppedVolume(50, 'PageUp')).toBe(60)
    expect(getSteppedVolume(50, 'PageDown')).toBe(40)
  })

  it('goes to the ends on Home and End', () => {
    expect(getSteppedVolume(50, 'Home')).toBe(0)
    expect(getSteppedVolume(50, 'End')).toBe(100)
  })

  it('stops at the ends rather than wrapping round them', () => {
    expect(getSteppedVolume(100, 'ArrowUp')).toBe(100)
    expect(getSteppedVolume(0, 'ArrowDown')).toBe(0)
    expect(getSteppedVolume(3, 'PageDown')).toBe(0)
  })

  it('gives back nothing for a key that is not its business', () => {
    for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape']) {
      expect(getSteppedVolume(50, key)).toBeNull()
    }
  })
})
