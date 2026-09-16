import { describe, expect, it } from 'vitest'

import {
  formatDuration,
  formatMonth,
  formatPeriod,
  getDurationMonths,
  getMonthIndex,
  toMonthKey,
} from '../components/resume/period'

describe('reading a date out of the data', () => {
  it('counts months so two dates can be subtracted', () => {
    expect(getMonthIndex('2024-02') - getMonthIndex('2023-04')).toBe(10)
  })

  it('refuses anything that is not a month', () => {
    for (const bad of ['2023', '2023-13', '2023-00', 'Present', '', '23-04']) {
      expect(getMonthIndex(bad)).toBeNaN()
    }
  })

  it('reads a month with room around it', () => {
    expect(getMonthIndex(' 2023-04 ')).toBe(getMonthIndex('2023-04'))
  })
})

describe('saying the month in the language being read', () => {
  it('gives Ukrainian months for ua, not English ones', () => {
    const written = formatMonth('2023-04', 'ua')

    expect(written).toContain('2023')
    expect(written).toMatch(/квіт/i)
  })

  it('gives Russian months for ru', () => {
    expect(formatMonth('2023-04', 'ru')).toMatch(/апрел/i)
  })

  it('gives English months for en', () => {
    expect(formatMonth('2023-04', 'en')).toMatch(/April/i)
  })

  it('hands back what it was given when that was not a month', () => {
    expect(formatMonth('whenever', 'en')).toBe('whenever')
  })
})

describe('the period on a card', () => {
  it('joins the two ends', () => {
    const written = formatPeriod('2023-04', '2024-02', 'en', 'present')

    expect(written).toMatch(/April 2023/)
    expect(written).toMatch(/February 2024/)
  })

  it('says the given word instead of an end date for a current job', () => {
    expect(formatPeriod('2023-04', null, 'ru', 'настоящее время')).toMatch(/настоящее время$/)
  })
})

describe('how long a job lasted', () => {
  it('counts the month it ended in', () => {
    expect(getDurationMonths('2023-01', '2023-01', new Date())).toBe(1)
    expect(getDurationMonths('2023-01', '2023-12', new Date())).toBe(12)
  })

  it('measures a current job up to today', () => {
    expect(getDurationMonths('2024-01', null, new Date(2024, 5, 15))).toBe(6)
  })

  it('is never negative and never zero', () => {
    expect(getDurationMonths('2024-06', '2023-01', new Date())).toBeGreaterThan(0)
    expect(getDurationMonths('nonsense', null, new Date())).toBe(0)
  })
})

describe('saying a duration in words', () => {
  it('drops the years when there are none', () => {
    expect(formatDuration(5, 'en')).toMatch(/^5 months$/i)
  })

  it('drops the months when it lands on a whole year', () => {
    expect(formatDuration(24, 'en')).toMatch(/^2 years$/i)
  })

  it('says both when there are both', () => {
    const written = formatDuration(28, 'en')

    expect(written).toMatch(/2 years/i)
    expect(written).toMatch(/4 months/i)
  })

  it('gets the Russian plural right at one, two and five', () => {
    expect(formatDuration(1, 'ru')).toMatch(/месяц$/)
    expect(formatDuration(2, 'ru')).toMatch(/месяца$/)
    expect(formatDuration(5, 'ru')).toMatch(/месяцев$/)
  })

  it('reads zero months as a reading rather than as nothing', () => {
    expect(formatDuration(0, 'en')).toMatch(/0/)
  })
})
