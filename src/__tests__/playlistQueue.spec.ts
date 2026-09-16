import { describe, expect, it } from 'vitest'

import { createPlaylistQueue, type PlaylistQueueOptions } from '../audio/playlistQueue'

function scriptedRandom(values: number[]) {
  let index = 0
  return () => values[index++ % values.length]!
}

function drain(
  trackCount: number,
  options: PlaylistQueueOptions,
  steps: number,
): (number | null)[] {
  const queue = createPlaylistQueue(trackCount, options)
  const played: (number | null)[] = [queue.current()]

  for (let step = 0; step < steps; step += 1) played.push(queue.next())

  return played
}

describe('playlist queue', () => {
  it('plays the declared order and wraps when it repeats', () => {
    expect(drain(3, { mode: 'sequential', repeat: true }, 4)).toEqual([0, 1, 2, 0, 1])
  })

  it('stops at the end when it does not repeat', () => {
    const played = drain(2, { mode: 'sequential', repeat: false }, 3)

    expect(played).toEqual([0, 1, null, null])
  })

  it('opens on the requested track', () => {
    const queue = createPlaylistQueue(4, { mode: 'sequential', repeat: true, startIndex: 2 })

    expect(queue.current()).toBe(2)
    expect(queue.next()).toBe(3)
  })

  it('falls back to the first track when the requested one is out of range', () => {
    const queue = createPlaylistQueue(2, { mode: 'sequential', repeat: true, startIndex: 9 })

    expect(queue.current()).toBe(0)
  })

  it('plays every track once per shuffled cycle', () => {
    const queue = createPlaylistQueue(5, {
      mode: 'shuffle',
      repeat: true,
      random: scriptedRandom([0.7, 0.2, 0.9, 0.4, 0.1]),
    })

    const cycle = [queue.current(), queue.next(), queue.next(), queue.next(), queue.next()]

    expect([...cycle].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it('never repeats a track across the shuffle seam', () => {
    const queue = createPlaylistQueue(3, { mode: 'shuffle', repeat: true })

    let last = queue.current()
    for (let step = 0; step < 300; step += 1) {
      const played = queue.next()
      expect(played).not.toBe(last)
      last = played
    }
  })

  it('accepts a single track, where a repeat is unavoidable', () => {
    const queue = createPlaylistQueue(1, { mode: 'shuffle', repeat: true, random: () => 0.5 })

    expect(queue.current()).toBe(0)
    expect(queue.next()).toBe(0)
    expect(queue.next()).toBe(0)
  })

  it('has nothing to play when the playlist is empty', () => {
    const queue = createPlaylistQueue(0, { mode: 'sequential', repeat: true })

    expect(queue.current()).toBeNull()
    expect(queue.next()).toBeNull()
    expect(queue.previous()).toBeNull()
  })

  it('steps back, wrapping only when it repeats', () => {
    const looping = createPlaylistQueue(3, { mode: 'sequential', repeat: true })
    expect(looping.previous()).toBe(2)

    const once = createPlaylistQueue(3, { mode: 'sequential', repeat: false })
    expect(once.previous()).toBe(0)
  })

  it('makes a chosen track current and carries on from it', () => {
    const queue = createPlaylistQueue(4, { mode: 'sequential', repeat: true })

    expect(queue.jumpTo(2)).toBe(2)
    expect(queue.current()).toBe(2)
    expect(queue.next()).toBe(3)
  })

  it('keeps the rest of a shuffle after jumping into it', () => {
    const queue = createPlaylistQueue(4, { mode: 'shuffle', repeat: true, random: () => 0.5 })
    const played = [queue.jumpTo(1)]

    for (let step = 0; step < 3; step += 1) played.push(queue.next())

    expect(new Set(played).size).toBe(4)
    expect(played[0]).toBe(1)
  })

  it('ignores a jump to a track that is not there', () => {
    const queue = createPlaylistQueue(2, { mode: 'sequential', repeat: true })

    expect(queue.jumpTo(5)).toBeNull()
    expect(queue.jumpTo(-1)).toBeNull()
    expect(queue.jumpTo(1.5)).toBeNull()
    expect(queue.current()).toBe(0)
  })

  it('revives a queue that had run out', () => {
    const queue = createPlaylistQueue(2, { mode: 'sequential', repeat: false })
    queue.next()
    expect(queue.next()).toBeNull()

    expect(queue.jumpTo(0)).toBe(0)
    expect(queue.current()).toBe(0)
  })

  it('reopens the playlist after a reset', () => {
    const queue = createPlaylistQueue(2, { mode: 'sequential', repeat: false })
    queue.next()
    expect(queue.next()).toBeNull()

    queue.reset()

    expect(queue.current()).toBe(0)
    expect(queue.next()).toBe(1)
  })

  it('rejects a nonsensical track count', () => {
    expect(() => createPlaylistQueue(-1, { mode: 'sequential', repeat: true })).toThrow(RangeError)
    expect(() => createPlaylistQueue(1.5, { mode: 'sequential', repeat: true })).toThrow(RangeError)
  })
})
