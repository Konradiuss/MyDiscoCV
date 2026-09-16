import { getMonthIndex, toMonthKey } from './period'

export interface TimelineEntry {
  readonly id: string
  readonly start: string
  readonly end: string | null
}

export interface TimelineStop {
  readonly id: string
  readonly year: number
  readonly current: boolean
  readonly gapBefore: boolean
}

export function getTimeline(entries: readonly TimelineEntry[], now: Date): TimelineStop[] {
  const nowKey = toMonthKey(now)

  const dated = entries
    .map((entry) => ({
      id: entry.id,
      from: getMonthIndex(entry.start),
      to: getMonthIndex(entry.end ?? nowKey),
      current: entry.end === null,
    }))
    .filter((entry) => !Number.isNaN(entry.from) && !Number.isNaN(entry.to))
    .map((entry) => ({ ...entry, to: Math.max(entry.from, entry.to) }))

  const ordered = dated.slice().sort((a, b) => b.to - a.to || b.from - a.from)

  return ordered.map((entry, index) => {
    const older = ordered[index + 1]

    return {
      id: entry.id,
      year: Math.floor(entry.from / 12),
      current: entry.current,
      gapBefore: older !== undefined && entry.from - older.to > 1,
    }
  })
}
