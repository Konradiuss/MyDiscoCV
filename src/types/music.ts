export const playbackModes = ['sequential', 'shuffle'] as const

export type PlaybackMode = (typeof playbackModes)[number]

export const trackEndBehaviours = ['repeat', 'advance'] as const

export type TrackEndBehaviour = (typeof trackEndBehaviours)[number]

export const labelPatterns = ['cubes', 'stairs', 'scales'] as const

export type LabelPattern = (typeof labelPatterns)[number]

export interface TrackDefinition {
  readonly id: string
  readonly artist: string
  readonly title: string
  /** File name inside `src/assets/audio`, extension included. */
  readonly file: string
  /** Square sleeve art, a file name inside `src/assets/covers`. */
  readonly cover?: string
  /** The design on the record label; a plain white label when omitted. */
  readonly label?: LabelPattern
}

export interface Track extends TrackDefinition {
  readonly src: string
  readonly coverSrc?: string
}

export interface PlaylistConfig {
  readonly mode: PlaybackMode
  readonly repeat: boolean
  readonly whenTrackEnds?: TrackEndBehaviour
  readonly volume: number
  readonly startWith?: string
  readonly tracks: readonly TrackDefinition[]
}
