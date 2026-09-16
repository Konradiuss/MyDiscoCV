import type { Locale } from '@/types/resume'

/** `ua` is our route, not a language tag: Ukrainian is `uk`. */
export const LANGUAGE_TAGS: Record<Locale, string> = {
  ua: 'uk-UA',
  ru: 'ru-RU',
  en: 'en-GB',
}

export function getMonthIndex(value: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim())
  if (!match) return Number.NaN

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return Number.NaN

  return year * 12 + (month - 1)
}

export function toMonthKey(at: Date): string {
  if (Number.isNaN(at.getTime())) return '0000-01'

  return `${String(at.getFullYear()).padStart(4, '0')}-${String(at.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonth(value: string, locale: Locale): string {
  const index = getMonthIndex(value)
  if (Number.isNaN(index)) return value

  const date = new Date(Date.UTC(Math.floor(index / 12), index % 12, 1))

  return new Intl.DateTimeFormat(LANGUAGE_TAGS[locale], {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatPeriod(
  start: string,
  end: string | null,
  locale: Locale,
  present: string,
): string {
  const from = formatMonth(start, locale)
  const to = end === null ? present : formatMonth(end, locale)

  return `${from} – ${to}`
}

export function getDurationMonths(start: string, end: string | null, now: Date): number {
  const from = getMonthIndex(start)
  const to = getMonthIndex(end ?? toMonthKey(now))
  if (Number.isNaN(from) || Number.isNaN(to)) return 0

  return Math.max(1, to - from + 1)
}

export function formatDuration(months: number, locale: Locale): string {
  const tag = LANGUAGE_TAGS[locale]
  const whole = Math.max(0, Math.round(months))
  const years = Math.floor(whole / 12)
  const rest = whole % 12

  const say = (value: number, unit: 'year' | 'month') =>
    new Intl.NumberFormat(tag, { style: 'unit', unit, unitDisplay: 'long' }).format(value)

  if (years === 0) return say(rest, 'month')
  if (rest === 0) return say(years, 'year')

  return `${say(years, 'year')} ${say(rest, 'month')}`
}
