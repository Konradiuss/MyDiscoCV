import { describe, expect, it } from 'vitest'

import { createTrackResolver, resolveTracks } from '../audio/trackSources'
import { playlist } from '../data/playlist'

const urls = {
  '../assets/audio/first-track.mp3': '/assets/first-track.a1b2c3.mp3',
  '../assets/audio/second-track.mp3': '/assets/second-track.d4e5f6.mp3',
}

describe('track sources', () => {
  it('resolves a manifest file name to its built URL', () => {
    const resolve = createTrackResolver(urls)

    expect(resolve('second-track.mp3')).toBe('/assets/second-track.d4e5f6.mp3')
  })

  it('names the available files when one is missing', () => {
    const resolve = createTrackResolver(urls)

    expect(() => resolve('missing.mp3')).toThrow(/first-track\.mp3, second-track\.mp3/)
  })

  it('says the folder is empty rather than listing nothing', () => {
    const resolve = createTrackResolver({})

    expect(() => resolve('anything.mp3')).toThrow(/folder is empty/)
  })

  it('pairs every definition with a source', () => {
    const tracks = resolveTracks(
      [{ id: 'a', artist: 'Artist', title: 'Title', file: 'first-track.mp3' }],
      { resolveTrack: createTrackResolver(urls) },
    )

    expect(tracks).toEqual([
      {
        id: 'a',
        artist: 'Artist',
        title: 'Title',
        file: 'first-track.mp3',
        src: '/assets/first-track.a1b2c3.mp3',
        coverSrc: undefined,
      },
    ])
  })

  it('resolves the sleeve art a track names', () => {
    const covers = { '../assets/covers/first.jpg': '/assets/first.9f8e7d.jpg' }
    const [track] = resolveTracks(
      [{ id: 'a', artist: 'Artist', title: 'Title', file: 'first-track.mp3', cover: 'first.jpg' }],
      { resolveTrack: createTrackResolver(urls), resolveCover: createTrackResolver(covers) },
    )

    expect(track!.coverSrc).toBe('/assets/first.9f8e7d.jpg')
  })

  it('refuses a named cover that is not there', () => {
    expect(() =>
      resolveTracks(
        [{ id: 'a', artist: 'A', title: 'T', file: 'first-track.mp3', cover: 'gone.jpg' }],
        { resolveTrack: createTrackResolver(urls), resolveCover: createTrackResolver({}) },
      ),
    ).toThrow(/gone\.jpg/)
  })

  it('resolves every track the shipped playlist declares', () => {
    expect(() => resolveTracks(playlist.tracks)).not.toThrow()
  })

  it('keeps the playlist ids unique', () => {
    const ids = playlist.tracks.map((track) => track.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
