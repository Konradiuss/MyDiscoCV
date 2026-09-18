import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createShotLoader, type ImageLike } from '../components/resume/shotLoader'

/** Stands in for the browser's image cache, with the arrivals under our control. */
function createLine() {
  const waiting: { listeners: Map<string, () => void>; source: string }[] = []

  const createImage = (): ImageLike => {
    const listeners = new Map<string, () => void>()
    let source = ''

    return {
      decoding: '',
      get src() {
        return source
      },
      set src(value: string) {
        source = value
        waiting.push({ listeners, source: value })
      },
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener)
      },
    }
  }

  const settle = (source: string, ok = true) => {
    const index = waiting.findIndex((entry) => entry.source === source)
    if (index < 0) throw new Error(`nothing is loading "${source}"`)

    const [entry] = waiting.splice(index, 1)
    entry!.listeners.get(ok ? 'load' : 'error')?.()
  }

  return { createImage, settle, pending: () => waiting.map((entry) => entry.source) }
}

describe('showing a screenshot only once it can be painted', () => {
  let line: ReturnType<typeof createLine>

  beforeEach(() => {
    vi.useFakeTimers()
    line = createLine()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const loader = () => createShotLoader({ createImage: line.createImage, spinnerDelayMs: 150 })

  it('waits before putting the first picture on screen', () => {
    const shots = loader()

    shots.show('one.webp')
    expect(shots.shown.value).toBe('')

    line.settle('one.webp')
    expect(shots.shown.value).toBe('one.webp')
  })

  it('says it is working straight away when the screen is still empty', () => {
    const shots = loader()

    shots.show('one.webp')

    expect(shots.pending.value).toBe(true)
  })

  it('keeps the picture it has while the next one is on its way', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')
    shots.show('two.webp')

    expect(shots.shown.value).toBe('one.webp')
  })

  it('does not flash a spinner over a picture that arrives quickly', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')

    shots.show('two.webp')
    vi.advanceTimersByTime(100)
    line.settle('two.webp')
    vi.advanceTimersByTime(200)

    expect(shots.pending.value).toBe(false)
    expect(shots.shown.value).toBe('two.webp')
  })

  it('owns up to waiting when the picture takes its time', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')

    shots.show('two.webp')
    expect(shots.pending.value).toBe(false)

    vi.advanceTimersByTime(150)
    expect(shots.pending.value).toBe(true)

    line.settle('two.webp')
    expect(shots.pending.value).toBe(false)
  })

  it('ignores a picture the visitor has already stepped past', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')

    shots.show('two.webp')
    shots.show('three.webp')

    line.settle('three.webp')
    expect(shots.shown.value).toBe('three.webp')

    line.settle('two.webp')
    expect(shots.shown.value).toBe('three.webp')
  })

  it('shows a picture it has seen before without any wait at all', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')
    shots.show('two.webp')
    line.settle('two.webp')

    shots.show('one.webp')

    expect(shots.shown.value).toBe('one.webp')
    expect(shots.pending.value).toBe(false)
    expect(line.pending()).toEqual([])
  })

  it('steps instantly onto a picture that was fetched ahead', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')

    shots.prefetch('two.webp')
    line.settle('two.webp')

    shots.show('two.webp')

    expect(shots.shown.value).toBe('two.webp')
    expect(shots.pending.value).toBe(false)
  })

  it('does not fetch ahead for something already in hand', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')
    shots.prefetch('one.webp')

    expect(line.pending()).toEqual([])
  })

  it('gives up rather than spinning forever when a picture will not come', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp', false)

    expect(shots.pending.value).toBe(false)
    expect(shots.failed.value).toBe(true)
  })

  it('clears the failure once a later picture arrives', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp', false)

    shots.show('two.webp')
    expect(shots.failed.value).toBe(false)

    line.settle('two.webp')
    expect(shots.shown.value).toBe('two.webp')
  })

  it('comes back empty for the next gallery', () => {
    const shots = loader()

    shots.show('one.webp')
    line.settle('one.webp')
    shots.reset()

    expect(shots.shown.value).toBe('')
    expect(shots.pending.value).toBe(false)
  })

  it('lets a late arrival from a closed gallery pass without showing it', () => {
    const shots = loader()

    shots.show('one.webp')
    shots.reset()
    line.settle('one.webp')

    expect(shots.shown.value).toBe('')
  })

  it('survives a browser that hands back no image at all', () => {
    const shots = createShotLoader({ createImage: () => null })

    shots.show('one.webp')

    expect(shots.failed.value).toBe(true)
    expect(shots.pending.value).toBe(false)
  })
})
