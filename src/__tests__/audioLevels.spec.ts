import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUDIO_BAND_COUNT,
  createAudioLevelTap,
  readAudioLevels,
  type AudioContextLike,
  type GestureTargetLike,
} from '../audio/audioLevels'

function createGestures() {
  const listeners = new Set<() => void>()

  const target: GestureTargetLike = {
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  }

  return {
    target,
    get count() {
      return listeners.size
    },
    async fire() {
      for (const listener of listeners) listener()
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

function createContext(options: { startsAs?: string; resumesTo?: string } = {}) {
  const analyser = {
    fftSize: 2048,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 512,
    getByteFrequencyData: vi.fn<(target: Uint8Array) => void>((target) => target.fill(255)),
    connect: vi.fn<(destination: unknown) => void>(),
    disconnect: vi.fn<() => void>(),
  }
  const source = {
    connect: vi.fn<(destination: unknown) => void>(),
    disconnect: vi.fn<() => void>(),
  }
  const context = {
    state: options.startsAs ?? 'suspended',
    sampleRate: 48000,
    destination: { name: 'speakers' },
    createAnalyser: vi.fn<() => typeof analyser>(() => analyser),
    createMediaElementSource: vi.fn<(element: unknown) => typeof source>(() => source),
    resume: vi.fn<() => Promise<void>>(async () => {
      context.state = options.resumesTo ?? 'running'
    }),
    close: vi.fn<() => Promise<void>>(async () => {}),
  }

  return { context: context as unknown as AudioContextLike, analyser, source, raw: context }
}

const element = { id: 'the audio element' }

function createPlayingElement() {
  const listeners = new Map<string, Set<() => void>>()

  return {
    id: 'the audio element',
    addEventListener(type: string, listener: () => void) {
      const forType = listeners.get(type) ?? new Set<() => void>()
      forType.add(listener)
      listeners.set(type, forType)
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener)
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0
    },
    async emit(type: string) {
      for (const listener of listeners.get(type) ?? []) listener()
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

describe('tapping the audio element', () => {
  it('creates nothing at all until there has been a gesture', () => {
    const gestures = createGestures()
    const createContextSpy = vi.fn<() => AudioContextLike>(() => createContext().context)

    createAudioLevelTap(element, {
      createContext: createContextSpy,
      gestureTarget: gestures.target,
    })

    expect(createContextSpy).not.toHaveBeenCalled()
    expect(gestures.count).toBeGreaterThan(0)
  })

  it('routes the element to the speakers once the graph is running', async () => {
    const gestures = createGestures()
    const made = createContext()
    const tap = createAudioLevelTap(element, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await gestures.fire()

    expect(made.raw.createMediaElementSource).toHaveBeenCalledWith(element)
    expect(made.source.connect).toHaveBeenCalledWith(made.analyser)
    expect(made.analyser.connect).toHaveBeenCalledWith(made.raw.destination)
    expect(tap.read().live).toBe(true)
  })

  it('opens when the music starts, with nobody having clicked anything', async () => {
    const gestures = createGestures()
    const made = createContext()
    const sounding = createPlayingElement()
    const tap = createAudioLevelTap(sounding, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    expect(made.raw.createMediaElementSource).not.toHaveBeenCalled()

    await sounding.emit('playing')

    expect(made.raw.createMediaElementSource).toHaveBeenCalledWith(sounding)
    expect(tap.read().live).toBe(true)
  })

  it('taps only once however many times playback starts', async () => {
    const gestures = createGestures()
    const made = createContext()
    const sounding = createPlayingElement()
    createAudioLevelTap(sounding, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await sounding.emit('playing')
    await gestures.fire()
    await sounding.emit('playing')

    expect(made.raw.createMediaElementSource).toHaveBeenCalledTimes(1)
  })

  it('stops listening to the element it has let go of', async () => {
    const made = createContext()
    const sounding = createPlayingElement()
    const tap = createAudioLevelTap(sounding, {
      createContext: () => made.context,
      gestureTarget: createGestures().target,
    })

    expect(sounding.listenerCount('playing')).toBe(1)
    tap.dispose()
    expect(sounding.listenerCount('playing')).toBe(0)
  })

  it('leaves the element alone while the graph refuses to start', async () => {
    const gestures = createGestures()
    const made = createContext({ resumesTo: 'suspended' })
    const tap = createAudioLevelTap(element, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await gestures.fire()

    expect(made.raw.resume).toHaveBeenCalled()
    expect(made.raw.createMediaElementSource).not.toHaveBeenCalled()
    expect(tap.read().live).toBe(false)
    expect(gestures.count).toBeGreaterThan(0)
  })

  it('tries again on the next gesture, and taps only once when it works', async () => {
    const gestures = createGestures()
    const made = createContext()
    made.raw.resume.mockImplementationOnce(async () => {})

    createAudioLevelTap(element, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await gestures.fire()
    expect(made.raw.createMediaElementSource).not.toHaveBeenCalled()

    await gestures.fire()
    await gestures.fire()
    expect(made.raw.createMediaElementSource).toHaveBeenCalledTimes(1)
  })

  it('gives up quietly where there is no WebAudio', async () => {
    const gestures = createGestures()
    const tap = createAudioLevelTap(element, {
      createContext: () => null,
      gestureTarget: gestures.target,
    })

    await gestures.fire()

    expect(tap.read().live).toBe(false)
    expect(gestures.count).toBe(0)
  })

  it('gives up quietly where the graph throws', async () => {
    const gestures = createGestures()
    const made = createContext()
    made.raw.createMediaElementSource.mockImplementation(() => {
      throw new Error('this element is already tapped')
    })

    const tap = createAudioLevelTap(element, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await gestures.fire()

    expect(tap.read().live).toBe(false)
    expect(gestures.count).toBe(0)
  })

  it('reads a band for every column, and a low and a middle of their own', async () => {
    const gestures = createGestures()
    const made = createContext()
    const tap = createAudioLevelTap(element, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await gestures.fire()
    const reading = tap.read()

    expect(reading.bands).toHaveLength(AUDIO_BAND_COUNT)
    expect(reading.bass).toBe(1)
    expect(reading.mid).toBe(1)
    expect(reading.bands.every((band) => band === 1)).toBe(true)
  })

  it('reads as silence once it has been disposed of', async () => {
    const gestures = createGestures()
    const made = createContext()
    const tap = createAudioLevelTap(element, {
      createContext: () => made.context,
      gestureTarget: gestures.target,
    })

    await gestures.fire()
    tap.dispose()

    expect(made.source.disconnect).toHaveBeenCalled()
    expect(tap.read().live).toBe(false)
    expect(gestures.count).toBe(0)
  })
})

describe('reading levels before anything is listening', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('is safe, and says plainly that it heard nothing', () => {
    const reading = readAudioLevels()

    expect(reading.live).toBe(false)
    expect(reading.bass).toBe(0)
    expect(reading.bands).toHaveLength(AUDIO_BAND_COUNT)
  })
})
