import { getBandBins, getBandLevels, type BandBins } from './spectrum'

/**
 * Analyses the playing music so the speaker and the meter in the room can react.
 * Best effort: without WebAudio the music still plays untouched.
 */

export interface AudioLevelReading {
  readonly bass: number
  readonly mid: number
  readonly bands: readonly number[]
  readonly live: boolean
}

export const AUDIO_BAND_COUNT = 7

const METER_LOW_HZ = 40
const METER_HIGH_HZ = 12000
const BASS_LOW_HZ = 30
const BASS_HIGH_HZ = 160
const MID_LOW_HZ = 200
const MID_HIGH_HZ = 1400

const ANALYSER_FLOOR_DB = -72
const ANALYSER_CEILING_DB = -18
const ANALYSER_SMOOTHING = 0.5
const ANALYSER_FFT_SIZE = 1024

const SILENT: AudioLevelReading = {
  bass: 0,
  mid: 0,
  bands: Array.from({ length: AUDIO_BAND_COUNT }, () => 0),
  live: false,
}

interface AnalyserLike {
  fftSize: number
  minDecibels: number
  maxDecibels: number
  smoothingTimeConstant: number
  readonly frequencyBinCount: number
  getByteFrequencyData(target: Uint8Array): void
  connect(destination: unknown): void
  disconnect(): void
}

interface SourceLike {
  connect(destination: unknown): void
  disconnect(): void
}

export interface AudioContextLike {
  readonly state: string
  readonly sampleRate: number
  readonly destination: unknown
  createAnalyser(): AnalyserLike
  createMediaElementSource(element: unknown): SourceLike
  resume(): Promise<void>
  close(): Promise<void>
}

export interface GestureTargetLike {
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void
  removeEventListener(type: string, listener: () => void, options?: EventListenerOptions): void
}

export interface AudioLevelDeps {
  readonly createContext: () => AudioContextLike | null
  readonly gestureTarget: GestureTargetLike | null
}

export interface AudioLevelTap {
  read(): AudioLevelReading
  dispose(): void
}

const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

interface PlaybackSourceLike {
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

function asPlaybackSource(element: unknown): PlaybackSourceLike | null {
  if (!element || typeof element !== 'object') return null

  const candidate = element as Partial<PlaybackSourceLike>

  return typeof candidate.addEventListener === 'function' &&
    typeof candidate.removeEventListener === 'function'
    ? (candidate as PlaybackSourceLike)
    : null
}

export function createAudioLevelTap(element: unknown, deps: AudioLevelDeps): AudioLevelTap {
  let context: AudioContextLike | null = null
  let analyser: AnalyserLike | null = null
  let source: SourceLike | null = null
  let spectrum: Uint8Array | null = null
  let bands: readonly BandBins[] = []
  let bassBand: BandBins = [0, 1]
  let midBand: BandBins = [0, 1]
  let armed = false
  let refused = false
  let opening = false

  const playback = asPlaybackSource(element)

  function tryToOpen() {
    void open()
  }

  function arm() {
    if (armed || !deps.gestureTarget) return

    armed = true
    GESTURE_EVENTS.forEach((type) => {
      deps.gestureTarget?.addEventListener(type, tryToOpen, { capture: true, passive: true })
    })
  }

  function disarm() {
    if (!armed || !deps.gestureTarget) return

    armed = false
    GESTURE_EVENTS.forEach((type) => {
      deps.gestureTarget?.removeEventListener(type, tryToOpen, { capture: true })
    })
  }

  async function open() {
    if (refused || opening || !element) return

    opening = true
    try {
      context ??= deps.createContext()
      if (!context) {
        refused = true
        disarm()
        return
      }

      if (context.state !== 'running') await context.resume()
      if (context.state !== 'running') return
      if (analyser) return

      const node = context.createAnalyser()
      node.fftSize = ANALYSER_FFT_SIZE
      node.minDecibels = ANALYSER_FLOOR_DB
      node.maxDecibels = ANALYSER_CEILING_DB
      node.smoothingTimeConstant = ANALYSER_SMOOTHING

      const tapped = context.createMediaElementSource(element)
      tapped.connect(node)
      // Route onward to the speakers, or the music goes silent.
      node.connect(context.destination)

      const binCount = node.frequencyBinCount
      const { sampleRate } = context
      bands = getBandBins(AUDIO_BAND_COUNT, binCount, sampleRate, METER_LOW_HZ, METER_HIGH_HZ)
      bassBand = getBandBins(1, binCount, sampleRate, BASS_LOW_HZ, BASS_HIGH_HZ)[0] ?? [0, 1]
      midBand = getBandBins(1, binCount, sampleRate, MID_LOW_HZ, MID_HIGH_HZ)[0] ?? [0, 1]
      spectrum = new Uint8Array(binCount)
      source = tapped
      analyser = node
    } catch {
      refused = true
      disarm()
    } finally {
      opening = false
    }
  }

  arm()
  playback?.addEventListener('playing', tryToOpen)

  return {
    read() {
      if (!analyser || !spectrum) return SILENT

      analyser.getByteFrequencyData(spectrum)

      const [bass = 0, mid = 0] = getBandLevels(spectrum, [bassBand, midBand])

      return { bass, mid, bands: getBandLevels(spectrum, bands), live: true }
    },

    dispose() {
      disarm()
      playback?.removeEventListener('playing', tryToOpen)
      try {
        source?.disconnect()
        analyser?.disconnect()
        void context?.close()
      } catch {}

      source = null
      analyser = null
      spectrum = null
      context = null
    },
  }
}

function createBrowserDeps(): AudioLevelDeps {
  return {
    createContext: () => {
      const Constructor =
        typeof window === 'undefined'
          ? undefined
          : ((window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown })
              .AudioContext ??
            (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)

      if (typeof Constructor !== 'function') return null

      return new (Constructor as new () => unknown)() as AudioContextLike
    },
    gestureTarget: typeof window === 'undefined' ? null : window,
  }
}

let sharedTap: AudioLevelTap | null = null

export function tapAudioElement(element: unknown) {
  if (sharedTap) return

  sharedTap = createAudioLevelTap(element, createBrowserDeps())
}

export function readAudioLevels(): AudioLevelReading {
  return sharedTap?.read() ?? SILENT
}
