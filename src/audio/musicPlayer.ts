import { readonly, ref, type Ref } from 'vue'
import { playlist } from '@/data/playlist'
import type { PlaylistConfig, Track } from '@/types/music'
import { tapAudioElement } from './audioLevels'
import { createPlaylistQueue } from './playlistQueue'
import { resolveTracks } from './trackSources'

/**
 * Background music, started only where the visitor asks for it: the corner
 * toggle, the turntable buttons, or picking a sleeve.
 *
 * Browsers block audible playback until the visitor interacts with the page.
 * This module used to answer a refusal by listening for a gesture anywhere on
 * the window and retrying — see the commented-out `armGesture` below and the
 * note in src/components/ResumePage.vue for why that is switched off.
 */

export interface AudioElementLike {
  src: string
  volume: number
  preload: string
  currentTime: number
  loop: boolean
  play(): Promise<void> | void
  pause(): void
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

export interface GestureTargetLike {
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void
  removeEventListener(type: string, listener: () => void, options?: EventListenerOptions): void
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface MusicPlayerDeps {
  readonly tracks: readonly Track[]
  readonly config: PlaylistConfig
  readonly createAudio: () => AudioElementLike | null
  readonly gestureTarget: GestureTargetLike | null
  readonly storage: StorageLike | null
}

export interface MusicPlayer {
  readonly tracks: readonly Track[]
  readonly currentTrack: Readonly<Ref<Track | null>>
  readonly isPlaying: Readonly<Ref<boolean>>
  readonly isBlocked: Readonly<Ref<boolean>>
  readonly isEnabled: Readonly<Ref<boolean>>
  readonly volume: Readonly<Ref<number>>
  readonly elapsed: Readonly<Ref<number>>
  start(): void
  toggle(): void
  next(): void
  restart(): void
  playTrack(id: string): void
  setVolume(value: number): void
  destroy(): void
}

const ENABLED_STORAGE_KEY = 'discocv.music.enabled'
const VOLUME_STORAGE_KEY = 'discocv.music.volume'

const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function createMusicPlayer(deps: MusicPlayerDeps): MusicPlayer {
  const { config, tracks } = deps

  const repeatsTrack = (config.whenTrackEnds ?? 'repeat') === 'repeat'

  const startIndex = config.startWith
    ? tracks.findIndex((track) => track.id === config.startWith)
    : 0
  const queue = createPlaylistQueue(tracks.length, {
    mode: config.mode,
    repeat: config.repeat,
    startIndex: startIndex < 0 ? 0 : startIndex,
  })

  const currentTrack = ref<Track | null>(null)
  const isPlaying = ref(false)
  const isBlocked = ref(false)
  const isEnabled = ref(readEnabled())
  const volume = ref(readVolume())
  const elapsed = ref(0)

  let element: AudioElementLike | null = null
  let loadedTrackId: string | null = null
  let gestureArmed = false
  let started = false

  function readStored(key: string) {
    try {
      return deps.storage?.getItem(key) ?? null
    } catch {
      // Safari in private mode throws on any storage access.
      return null
    }
  }

  function writeStored(key: string, value: string) {
    try {
      deps.storage?.setItem(key, value)
    } catch {}
  }

  function readEnabled() {
    return readStored(ENABLED_STORAGE_KEY) !== 'false'
  }

  function readVolume() {
    const stored = Number.parseFloat(readStored(VOLUME_STORAGE_KEY) ?? '')
    return Number.isFinite(stored) ? clampVolume(stored) : clampVolume(config.volume)
  }

  function ensureElement() {
    if (element) return element

    const created = deps.createAudio()
    if (!created) return null

    element = created
    element.preload = 'none'
    // The element loops itself; restarting on `ended` leaves an audible gap.
    element.loop = repeatsTrack
    element.volume = volume.value
    element.addEventListener('playing', handlePlaying)
    element.addEventListener('pause', handlePause)
    element.addEventListener('ended', handleEnded)
    element.addEventListener('timeupdate', handleTimeUpdate)

    return element
  }

  function handleTimeUpdate() {
    if (!element) return

    const whole = Math.max(0, Math.floor(element.currentTime))
    if (whole !== elapsed.value) elapsed.value = whole
  }

  function handlePlaying() {
    isPlaying.value = true
    isBlocked.value = false
    releaseGesture()
  }

  function handlePause() {
    isPlaying.value = false
  }

  function handleEnded() {
    if (repeatsTrack) {
      attemptPlay()
      return
    }

    const index = queue.next()
    if (index === null) {
      isPlaying.value = false
      return
    }

    selectTrack(index)
    attemptPlay()
  }

  function handleGesture() {
    if (!isEnabled.value) {
      releaseGesture()
      return
    }

    attemptPlay()
  }

  /*
   * Switched off together with autoplay in src/components/ResumePage.vue.
   *
   * These listeners sat on the window in the capture phase and were never taken
   * off until playback finally succeeded, so any click, tap or keypress at all
   * could start the music — not just the first one, and not only the ones aimed
   * at the player. Restore this and the call in handleBlocked() below if the
   * autoplay attempt is ever brought back; on its own it would do nothing,
   * because nothing arms it.
   */
  // function armGesture() {
  //   if (gestureArmed || !deps.gestureTarget) return
  //
  //   gestureArmed = true
  //   GESTURE_EVENTS.forEach((type) => {
  //     deps.gestureTarget?.addEventListener(type, handleGesture, { capture: true, passive: true })
  //   })
  // }

  function releaseGesture() {
    if (!gestureArmed || !deps.gestureTarget) return

    gestureArmed = false
    GESTURE_EVENTS.forEach((type) => {
      deps.gestureTarget?.removeEventListener(type, handleGesture, { capture: true })
    })
  }

  function handleBlocked() {
    isPlaying.value = false
    isBlocked.value = true
    // armGesture()
  }

  function selectTrack(index: number) {
    const track = tracks[index]
    if (!track) return false

    if (currentTrack.value?.id !== track.id) elapsed.value = 0
    currentTrack.value = track
    return true
  }

  function attemptPlay() {
    const track = currentTrack.value
    if (!track) return

    const audio = ensureElement()
    if (!audio) return

    if (loadedTrackId !== track.id) {
      audio.src = track.src
      audio.preload = 'auto'
      loadedTrackId = track.id
    }

    audio.volume = volume.value

    let result: Promise<void> | void
    try {
      result = audio.play()
    } catch {
      handleBlocked()
      return
    }

    // Older browsers, and jsdom, return nothing at all from play().
    if (result && typeof result.catch === 'function') result.catch(handleBlocked)
  }

  function openCurrentTrack() {
    if (currentTrack.value) return true

    const index = queue.current()
    return index === null ? false : selectTrack(index)
  }

  openCurrentTrack()

  return {
    tracks,
    currentTrack: readonly(currentTrack) as Readonly<Ref<Track | null>>,
    isPlaying: readonly(isPlaying),
    isBlocked: readonly(isBlocked),
    isEnabled: readonly(isEnabled),
    volume: readonly(volume),
    elapsed: readonly(elapsed),

    start() {
      if (started) return

      started = true
      if (!openCurrentTrack() || !isEnabled.value) return

      attemptPlay()
    },

    toggle() {
      started = true

      if (isPlaying.value) {
        isEnabled.value = false
        writeStored(ENABLED_STORAGE_KEY, 'false')
        isBlocked.value = false
        releaseGesture()
        element?.pause()
        return
      }

      isEnabled.value = true
      writeStored(ENABLED_STORAGE_KEY, 'true')
      if (!openCurrentTrack()) return

      attemptPlay()
    },

    next() {
      const index = queue.next()
      if (index === null) return

      selectTrack(index)
      attemptPlay()
    },

    restart() {
      started = true
      isEnabled.value = true
      writeStored(ENABLED_STORAGE_KEY, 'true')
      if (!openCurrentTrack()) return

      attemptPlay()
      if (element) element.currentTime = 0
      elapsed.value = 0
    },

    playTrack(id) {
      const index = tracks.findIndex((track) => track.id === id)
      if (index < 0 || queue.jumpTo(index) === null) return

      started = true
      isEnabled.value = true
      writeStored(ENABLED_STORAGE_KEY, 'true')
      selectTrack(index)
      attemptPlay()
    },

    setVolume(value) {
      volume.value = clampVolume(value)
      writeStored(VOLUME_STORAGE_KEY, String(volume.value))
      if (element) element.volume = volume.value
    },

    destroy() {
      releaseGesture()

      if (element) {
        element.pause()
        element.removeEventListener('playing', handlePlaying)
        element.removeEventListener('pause', handlePause)
        element.removeEventListener('ended', handleEnded)
        element.removeEventListener('timeupdate', handleTimeUpdate)
        element = null
      }

      loadedTrackId = null
      isPlaying.value = false
      elapsed.value = 0
    },
  }
}

function createBrowserDeps(): MusicPlayerDeps {
  let tracks: Track[] = []

  try {
    tracks = resolveTracks(playlist.tracks)
  } catch (error) {
    console.error(error)
  }

  let storage: StorageLike | null = null
  try {
    storage = typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    storage = null
  }

  return {
    tracks,
    config: playlist,
    createAudio: () => {
      if (typeof Audio === 'undefined') return null

      const created = new Audio()
      tapAudioElement(created)

      return created
    },
    gestureTarget: typeof window === 'undefined' ? null : window,
    storage,
  }
}

let sharedPlayer: MusicPlayer | null = null

/** Module-scoped, so switching locale does not restart the music. */
export function useMusicPlayer(): MusicPlayer {
  if (!sharedPlayer) sharedPlayer = createMusicPlayer(createBrowserDeps())
  return sharedPlayer
}

export function startMusicPlayback() {
  useMusicPlayer().start()
}
