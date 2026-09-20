import { afterEach, describe, expect, it, vi } from 'vitest'

import { startFpsOverlay } from '../perf/fpsOverlay'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function runFrames(times: readonly number[]) {
  const queue: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    queue.push(callback)
    return queue.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

  const handle = startFpsOverlay('?fps')
  times.forEach((now) => queue.shift()?.(now))

  return handle
}

describe('fps overlay', () => {
  it('stays out of the way unless it is asked for', () => {
    expect(startFpsOverlay('')).toBeNull()
    expect(startFpsOverlay('?quality=low')).toBeNull()
    expect(document.body.children).toHaveLength(0)
  })

  it('appears on ?fps, with or without a value', () => {
    expect(startFpsOverlay('?fps')).not.toBeNull()
    expect(startFpsOverlay('?fps=1')).not.toBeNull()
    expect(document.body.children).toHaveLength(2)
  })

  it('reports the rate once it has enough frames to say', () => {
    // Twenty gaps of 25 ms, which is the redraw interval, so it prints on the last.
    const times = Array.from({ length: 22 }, (_, index) => index * 25)
    runFrames(times)

    const text = document.body.firstElementChild?.textContent ?? ''
    expect(text).toContain('40 fps')
    expect(text).toContain('p50 25.0 ms')
  })

  it('takes itself off the page when stopped', () => {
    const handle = runFrames([0, 16, 32])

    handle?.stop()
    expect(document.body.children).toHaveLength(0)
  })

  /* It is a diagnostic, so it must never eat a tap meant for the room. */
  it('cannot intercept a pointer', () => {
    startFpsOverlay('?fps')

    const node = document.body.firstElementChild as HTMLElement
    expect(node.style.pointerEvents).toBe('none')
  })
})
