import type { PlaylistConfig } from '@/types/music'

/**
 * The playlist. To add a track, drop the file into src/assets/audio and add an
 * entry below; `cover` names a square image in src/assets/covers.
 */
export const playlist: PlaylistConfig = {
  mode: 'sequential',
  repeat: true,
  whenTrackEnds: 'repeat',
  volume: 0.23,
  tracks: [
    {
      id: 'crab-apple',
      artist: 'Idris Muhammad',
      title: 'Crab Apple',
      file: 'idris-muhammad-crab-apple.mp3',
      cover: 'idris-muhammad-crab-apple.jpg',
      label: 'cubes',
    },
    {
      id: 'brand-new-girl',
      artist: 'Billy Garner Band',
      title: 'Brand New Girl',
      file: 'billy-garner-band-brand-new-girl.mp3',
      cover: 'billy-garner-band-brand-new-girl.jpg',
      label: 'stairs',
    },
    {
      id: 'va11halla',
      artist: 'Garoad',
      title: 'Welcome to VA-11 HALL-A',
      file: 'garoad-welcome-to-va11halla.mp3',
      cover: 'garoad-welcome-to-va11halla.jpg',
      label: 'scales',
    },
  ],
}
