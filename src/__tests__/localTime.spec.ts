import { describe, expect, it } from 'vitest'

import { formatLocalTime } from '../components/resume/localTime'

describe('the profile local time', () => {
  it('uses Kyiv standard time in winter', () => {
    expect(formatLocalTime(new Date('2026-01-15T10:05:00Z'), 'Europe/Kyiv')).toBe('12:05')
  })

  it('uses Kyiv daylight-saving time in summer', () => {
    expect(formatLocalTime(new Date('2026-07-15T10:05:00Z'), 'Europe/Kyiv')).toBe('13:05')
  })

  it('fails quietly when the date or time zone is invalid', () => {
    expect(formatLocalTime(new Date(Number.NaN), 'Europe/Kyiv')).toBe('--:--')
    expect(formatLocalTime(new Date(), 'not/a-time-zone')).toBe('--:--')
  })
})
