import { describe, expect, it } from 'vitest'

import { shouldAnimateScene } from '../components/disco/sceneLoop'

describe('when the room animates', () => {
  it('runs when the tab is open and nothing covers the scene', () => {
    expect(shouldAnimateScene({ hidden: false, covered: false })).toBe(true)
  })

  it('rests while the tab is in the background', () => {
    expect(shouldAnimateScene({ hidden: true, covered: false })).toBe(false)
  })

  it('rests while something is over the scene', () => {
    expect(shouldAnimateScene({ hidden: false, covered: true })).toBe(false)
  })

  it('stays at rest when the tab returns to something still covering it', () => {
    expect(shouldAnimateScene({ hidden: true, covered: true })).toBe(false)
  })
})
