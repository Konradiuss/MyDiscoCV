import type { PlaybackMode } from '@/types/music'

export interface PlaylistQueueOptions {
  readonly mode: PlaybackMode
  readonly repeat: boolean
  readonly startIndex?: number
  readonly random?: () => number
}

export interface PlaylistQueue {
  current(): number | null
  next(): number | null
  previous(): number | null
  jumpTo(index: number): number | null
  reset(): void
}

function shuffleInPlace(order: number[], random: () => number) {
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const held = order[index]!
    order[index] = order[swapIndex]!
    order[swapIndex] = held
  }
}

export function createPlaylistQueue(
  trackCount: number,
  options: PlaylistQueueOptions,
): PlaylistQueue {
  if (!Number.isInteger(trackCount) || trackCount < 0) {
    throw new RangeError('trackCount must be a non-negative integer')
  }

  const random = options.random ?? Math.random
  const order: number[] = []
  let position = 0
  let exhausted = false

  function fill(previousLast?: number) {
    order.length = 0
    for (let index = 0; index < trackCount; index += 1) order.push(index)

    if (options.mode !== 'shuffle') return

    shuffleInPlace(order, random)

    if (order.length > 1 && previousLast !== undefined && order[0] === previousLast) {
      const swapIndex = 1 + Math.floor(random() * (order.length - 1))
      order[0] = order[swapIndex]!
      order[swapIndex] = previousLast
    }
  }

  function openingPosition() {
    if (options.mode === 'shuffle') return 0

    const startIndex = options.startIndex
    if (startIndex === undefined) return 0

    return startIndex >= 0 && startIndex < trackCount ? startIndex : 0
  }

  fill()
  position = openingPosition()

  return {
    current() {
      if (trackCount === 0 || exhausted) return null
      return order[position] ?? null
    },

    next() {
      if (trackCount === 0 || exhausted) return null

      if (position + 1 < order.length) {
        position += 1
        return order[position]!
      }

      if (!options.repeat) {
        exhausted = true
        return null
      }

      fill(order[position])
      position = 0
      return order[position]!
    },

    previous() {
      if (trackCount === 0 || exhausted) return null

      if (position > 0) {
        position -= 1
      } else if (options.repeat) {
        position = order.length - 1
      }

      return order[position]!
    },

    jumpTo(index) {
      if (!Number.isInteger(index) || index < 0 || index >= trackCount) return null

      const found = order.indexOf(index)
      if (found < 0) return null

      exhausted = false
      position = found
      return index
    },

    reset() {
      exhausted = false
      fill()
      position = openingPosition()
    },
  }
}
