import { describe, expect, it } from 'vitest'

import {
  createMusicPlayer,
  type AudioElementLike,
  type GestureTargetLike,
  type MusicPlayerDeps,
  type StorageLike,
} from '../audio/musicPlayer'
import type { PlaylistConfig, Track } from '../types/music'

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

class EventSource {
  readonly listeners = new Map<string, Set<() => void>>()

  addEventListener(type: string, listener: () => void) {
    const forType = this.listeners.get(type) ?? new Set()
    forType.add(listener)
    this.listeners.set(type, forType)
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: string) {
    ;[...(this.listeners.get(type) ?? [])].forEach((listener) => listener())
  }

  get armedTypes() {
    return [...this.listeners.entries()]
      .filter(([, forType]) => forType.size > 0)
      .map(([type]) => type)
  }
}

class FakeAudio extends EventSource implements AudioElementLike {
  volume = 1
  preload = ''
  currentTime = 0
  loop = false
  playCount = 0
  pauseCount = 0
  srcAssignments = 0
  blocked = false

  #src = ''

  get src() {
    return this.#src
  }

  set src(value: string) {
    this.#src = value
    this.srcAssignments += 1
  }

  play() {
    this.playCount += 1
    if (this.blocked) return Promise.reject(new Error('NotAllowedError'))

    return Promise.resolve()
  }

  pause() {
    this.pauseCount += 1
    this.emit('pause')
  }
}

function createFakeStorage(initial: Record<string, string> = {}): StorageLike {
  const values = new Map(Object.entries(initial))

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  }
}

const tracks: Track[] = [
  { id: 'one', artist: 'First Artist', title: 'First Title', file: 'one.mp3', src: '/one.mp3' },
  { id: 'two', artist: 'Second Artist', title: 'Second Title', file: 'two.mp3', src: '/two.mp3' },
]

const config: PlaylistConfig = {
  mode: 'sequential',
  repeat: true,
  volume: 0.5,
  tracks,
}

function setup(overrides: Partial<MusicPlayerDeps> = {}) {
  const audio = new FakeAudio()
  const gestureTarget = new EventSource()

  const deps: MusicPlayerDeps = {
    tracks,
    config,
    createAudio: () => audio,
    gestureTarget: gestureTarget as GestureTargetLike,
    storage: createFakeStorage(),
    ...overrides,
  }

  return { audio, gestureTarget, storage: deps.storage!, player: createMusicPlayer(deps) }
}

describe('music player', () => {
  it('names its opening track before anything is started', () => {
    const { audio, player } = setup()

    expect(player.currentTrack.value).toEqual(tracks[0])
    expect(player.isPlaying.value).toBe(false)
    expect(audio.playCount).toBe(0)
    expect(audio.src).toBe('')
  })

  it('loads the first track but counts as playing only once it sounds', () => {
    const { audio, player } = setup()

    player.start()

    expect(audio.src).toBe('/one.mp3')
    expect(audio.playCount).toBe(1)
    expect(player.currentTrack.value).toEqual(tracks[0])
    expect(player.isPlaying.value).toBe(false)

    audio.emit('playing')

    expect(player.isPlaying.value).toBe(true)
  })

  it('waits for a gesture when the browser refuses to autoplay', async () => {
    const { audio, gestureTarget, player } = setup()
    audio.blocked = true

    player.start()
    await flush()

    expect(player.isBlocked.value).toBe(true)
    expect(player.isPlaying.value).toBe(false)
    expect(gestureTarget.armedTypes).toContain('pointerdown')
    expect(player.currentTrack.value).toEqual(tracks[0])

    audio.blocked = false
    gestureTarget.emit('pointerdown')
    audio.emit('playing')

    expect(audio.playCount).toBe(2)
    expect(player.isBlocked.value).toBe(false)
    expect(player.isPlaying.value).toBe(true)
    expect(gestureTarget.armedTypes).toEqual([])
  })

  it('keeps listening when the first gesture is not enough', async () => {
    const { audio, gestureTarget, player } = setup()
    audio.blocked = true

    player.start()
    await flush()

    gestureTarget.emit('pointerdown')
    await flush()

    expect(audio.playCount).toBe(2)
    expect(gestureTarget.armedTypes).toContain('pointerdown')
  })

  it('leaves the element to loop the track it is playing', () => {
    const { audio, player } = setup()

    player.start()

    expect(audio.loop).toBe(true)
    expect(player.currentTrack.value).toEqual(tracks[0])
  })

  it('plays the same track again if it ends anyway', () => {
    const { audio, player } = setup()

    player.start()
    audio.emit('playing')
    audio.emit('ended')

    expect(player.currentTrack.value).toEqual(tracks[0])
    expect(audio.src).toBe('/one.mp3')
    expect(audio.srcAssignments).toBe(1)
    expect(audio.playCount).toBe(2)
  })

  it('moves to the next track when one ends and it was told to advance', () => {
    const { audio, player } = setup({ config: { ...config, whenTrackEnds: 'advance' } })

    player.start()
    audio.emit('playing')
    audio.emit('ended')

    expect(audio.loop).toBe(false)
    expect(audio.src).toBe('/two.mp3')
    expect(audio.playCount).toBe(2)
    expect(player.currentTrack.value).toEqual(tracks[1])
  })

  it('resumes from a pause without reloading the track', () => {
    const { audio, player } = setup()

    player.start()
    audio.emit('playing')
    audio.emit('pause')

    expect(player.isPlaying.value).toBe(false)

    player.toggle()
    audio.emit('playing')

    expect(audio.srcAssignments).toBe(1)
    expect(player.isPlaying.value).toBe(true)
  })

  it('names the track but fetches nothing when the music is switched off', () => {
    const { audio, player } = setup({
      storage: createFakeStorage({ 'discocv.music.enabled': 'false' }),
    })

    player.start()

    expect(player.isEnabled.value).toBe(false)
    expect(audio.playCount).toBe(0)
    expect(player.currentTrack.value).toEqual(tracks[0])
    expect(audio.src).toBe('')
  })

  it('remembers being switched off, and switched back on', () => {
    const { audio, storage, player } = setup()

    player.start()
    audio.emit('playing')

    player.toggle()

    expect(audio.pauseCount).toBe(1)
    expect(storage.getItem('discocv.music.enabled')).toBe('false')

    player.toggle()

    expect(storage.getItem('discocv.music.enabled')).toBe('true')
    expect(audio.playCount).toBe(2)
  })

  it('starts from the toggle when autoplay never happened', () => {
    const { audio, player } = setup({
      storage: createFakeStorage({ 'discocv.music.enabled': 'false' }),
    })

    player.start()
    player.toggle()

    expect(audio.src).toBe('/one.mp3')
    expect(audio.playCount).toBe(1)
  })

  it('plays the track a sleeve asks for', () => {
    const { audio, player } = setup()

    player.start()
    audio.emit('playing')
    player.playTrack('two')

    expect(player.currentTrack.value).toEqual(tracks[1])
    expect(audio.src).toBe('/two.mp3')
    expect(audio.playCount).toBe(2)
  })

  it('turns the music back on when a sleeve is picked', () => {
    const { audio, storage, player } = setup({
      storage: createFakeStorage({ 'discocv.music.enabled': 'false' }),
    })

    player.start()
    expect(audio.playCount).toBe(0)

    player.playTrack('two')

    expect(player.isEnabled.value).toBe(true)
    expect(storage.getItem('discocv.music.enabled')).toBe('true')
    expect(audio.playCount).toBe(1)
  })

  it('shrugs at a track id it does not know', () => {
    const { audio, player } = setup()

    player.start()
    player.playTrack('nothing-like-it')

    expect(player.currentTrack.value).toEqual(tracks[0])
    expect(audio.playCount).toBe(1)
  })

  it('opens on the track the config asks for', () => {
    const { audio, player } = setup({ config: { ...config, startWith: 'two' } })

    player.start()

    expect(audio.src).toBe('/two.mp3')
  })

  it('remembers the volume and applies it to the element', () => {
    const { audio, storage, player } = setup()

    player.start()
    player.setVolume(0.2)

    expect(audio.volume).toBe(0.2)
    expect(player.volume.value).toBe(0.2)
    expect(storage.getItem('discocv.music.volume')).toBe('0.2')
  })

  it('does nothing at all without tracks', () => {
    const { audio, player } = setup({ tracks: [], config: { ...config, tracks: [] } })

    player.start()
    player.toggle()

    expect(audio.playCount).toBe(0)
    expect(player.currentTrack.value).toBeNull()
  })

  it('survives having no audio to play through', () => {
    const { player } = setup({ createAudio: () => null })

    expect(() => player.start()).not.toThrow()
    expect(player.isPlaying.value).toBe(false)
  })

  it('winds a playing track back to its start', () => {
    const { audio, player } = setup()

    player.start()
    audio.currentTime = 42
    const loads = audio.srcAssignments
    player.restart()

    expect(audio.currentTime).toBe(0)
    expect(audio.playCount).toBe(2)
    expect(audio.srcAssignments).toBe(loads)
  })

  it('turns the music back on, and remembers that it did', () => {
    const { audio, player, storage } = setup()

    player.start()
    audio.emit('playing')
    player.toggle()
    expect(player.isEnabled.value).toBe(false)

    player.restart()

    expect(player.isEnabled.value).toBe(true)
    expect(storage.getItem('discocv.music.enabled')).toBe('true')
    expect(audio.currentTime).toBe(0)
    expect(audio.playCount).toBe(2)
  })

  it('starts from the top when the track had never been loaded', () => {
    const { audio, player } = setup()

    player.restart()

    expect(audio.srcAssignments).toBe(1)
    expect(audio.currentTime).toBe(0)
    expect(audio.playCount).toBe(1)
  })

  it('has nothing to restart without tracks', () => {
    const { audio, player } = setup({ tracks: [], config: { ...config, tracks: [] } })

    expect(() => player.restart()).not.toThrow()
    expect(audio.playCount).toBe(0)
  })
})

describe('how far into the track', () => {
  it('opens at nothing', () => {
    const { player } = setup()

    expect(player.elapsed.value).toBe(0)
  })

  it('follows the element as it plays', () => {
    const { audio, player } = setup()
    player.start()

    audio.currentTime = 3.2
    audio.emit('timeupdate')

    expect(player.elapsed.value).toBe(3)
  })

  it('changes only when the second has actually turned over', () => {
    const { audio, player } = setup()
    player.start()

    const seen: number[] = []
    for (const position of [1.0, 1.25, 1.5, 1.75, 2.0, 2.25]) {
      audio.currentTime = position
      audio.emit('timeupdate')
      seen.push(player.elapsed.value)
    }

    expect(seen).toEqual([1, 1, 1, 1, 2, 2])
  })

  it('holds its reading through a pause', () => {
    const { audio, player } = setup()
    player.start()

    audio.currentTime = 12.8
    audio.emit('timeupdate')
    audio.emit('playing')
    player.toggle()

    expect(player.elapsed.value).toBe(12)
  })

  it('goes back to nothing when another track is picked', () => {
    const { audio, player } = setup()
    player.start()

    audio.currentTime = 40
    audio.emit('timeupdate')
    player.playTrack('two')

    expect(player.elapsed.value).toBe(0)
  })

  it('goes back to nothing when the track is restarted', () => {
    const { audio, player } = setup()
    player.start()

    audio.currentTime = 40
    audio.emit('timeupdate')
    player.restart()

    expect(player.elapsed.value).toBe(0)
  })

  it('lets go of the element it was listening to', () => {
    const { audio, player } = setup()
    player.start()
    player.destroy()

    expect(audio.armedTypes).not.toContain('timeupdate')
    expect(player.elapsed.value).toBe(0)
  })
})
