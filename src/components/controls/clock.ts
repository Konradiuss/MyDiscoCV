import type { ReadoutCell } from './sevenSegment'

const MINUTE_SECONDS = 60
const MILLISECONDS = 1000

function digitsOf(value: number, places: number, blankLeadingZero: boolean): ReadoutCell[] {
  const whole = Math.max(0, Math.floor(value))
  const cells: ReadoutCell[] = []

  for (let place = places - 1; place >= 0; place -= 1) {
    const unit = 10 ** place
    const digit = Math.floor(whole / unit) % 10
    const blank = blankLeadingZero && digit === 0 && whole < unit && place > 0

    cells.push(blank ? null : digit)
  }

  return cells
}

export function getClockCells(at: Date): readonly ReadoutCell[] {
  const valid = !Number.isNaN(at.getTime())
  const hours = valid ? at.getHours() : 0
  const minutes = valid ? at.getMinutes() : 0

  return [...digitsOf(hours, 2, false), ':', ...digitsOf(minutes, 2, false)]
}

export function getElapsedCells(seconds: number): readonly ReadoutCell[] {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.min(99, Math.floor(safe / MINUTE_SECONDS))
  const rest = minutes === 99 ? MINUTE_SECONDS - 1 : safe % MINUTE_SECONDS

  return [...digitsOf(minutes, 2, true), ':', ...digitsOf(rest, 2, false)]
}

export function getMillisecondsToNextMinute(at: Date): number {
  const minute = MINUTE_SECONDS * MILLISECONDS
  if (Number.isNaN(at.getTime())) return minute

  const into = at.getSeconds() * MILLISECONDS + at.getMilliseconds()

  return minute - into
}
