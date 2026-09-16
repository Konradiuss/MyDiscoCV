import { createAssetResolver, type AssetResolver } from '@/lib/assetResolver'
import type { Track, TrackDefinition } from '@/types/music'

const audioUrls = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const coverUrls = import.meta.glob('../assets/covers/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export type TrackSourceResolver = AssetResolver

export const createTrackResolver = createAssetResolver

export const resolveTrackSource = createAssetResolver(audioUrls, 'src/assets/audio')
export const resolveCoverSource = createAssetResolver(coverUrls, 'src/assets/covers')

export interface TrackResolvers {
  readonly resolveTrack?: TrackSourceResolver
  readonly resolveCover?: TrackSourceResolver
}

export function resolveTracks(
  definitions: readonly TrackDefinition[],
  resolvers: TrackResolvers = {},
): Track[] {
  const resolveTrack = resolvers.resolveTrack ?? resolveTrackSource
  const resolveCover = resolvers.resolveCover ?? resolveCoverSource

  return definitions.map((definition) => ({
    ...definition,
    src: resolveTrack(definition.file),
    coverSrc: definition.cover === undefined ? undefined : resolveCover(definition.cover),
  }))
}
