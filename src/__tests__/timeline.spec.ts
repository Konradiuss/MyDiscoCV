import { describe, expect, it } from 'vitest'

import { getTimeline, type TimelineEntry } from '../components/resume/timeline'

const NOW = new Date(2026, 7, 21)

function timeline(entries: TimelineEntry[], now = NOW) {
  return getTimeline(entries, now)
}

describe('the order the jobs go down the rail in', () => {
  it('puts the most recent job at the top', () => {
    const stops = timeline([
      { id: 'old', start: '2020-01', end: '2021-12' },
      { id: 'new', start: '2022-01', end: '2023-12' },
    ])

    expect(stops.map((stop) => stop.id)).toEqual(['new', 'old'])
  })

  it('reads the year off the month the job began', () => {
    const stops = timeline([{ id: 'a', start: '2021-06', end: '2024-03' }])

    expect(stops[0]!.year).toBe(2021)
  })

  it('sits the current job at the top even when an older one ended later on paper', () => {
    const stops = timeline([
      { id: 'current', start: '2024-01', end: null },
      { id: 'past', start: '2020-01', end: '2023-12' },
    ])

    expect(stops[0]!.id).toBe('current')
    expect(stops[0]!.current).toBe(true)
  })

  it('marks only the job that is still going', () => {
    const stops = timeline([
      { id: 'now', start: '2024-01', end: null },
      { id: 'then', start: '2020-01', end: '2023-12' },
    ])

    expect(stops.filter((stop) => stop.current)).toHaveLength(1)
  })
})

describe('breaks between jobs', () => {
  it('marks a real break and ignores a handover month', () => {
    const broken = timeline([
      { id: 'after', start: '2023-01', end: '2023-12' },
      { id: 'before', start: '2020-01', end: '2020-12' },
    ])
    expect(broken.find((stop) => stop.id === 'after')!.gapBefore).toBe(true)

    const continuous = timeline([
      { id: 'after', start: '2021-01', end: '2023-12' },
      { id: 'before', start: '2020-01', end: '2020-12' },
    ])
    expect(continuous.find((stop) => stop.id === 'after')!.gapBefore).toBe(false)
  })

  it('never marks the oldest job as following a gap', () => {
    const stops = timeline([
      { id: 'new', start: '2023-01', end: null },
      { id: 'old', start: '2018-01', end: '2019-01' },
    ])

    expect(stops[stops.length - 1]!.gapBefore).toBe(false)
  })
})

describe('data that is not a career', () => {
  it('gives an empty rail for an empty list', () => {
    expect(timeline([])).toEqual([])
  })

  it('gives one stop for a single job', () => {
    const stops = timeline([{ id: 'only', start: '2022-01', end: '2022-06' }])

    expect(stops).toHaveLength(1)
    expect(stops[0]!.gapBefore).toBe(false)
  })

  it('drops entries whose dates are not dates', () => {
    const stops = timeline([
      { id: 'good', start: '2022-01', end: '2022-12' },
      { id: 'bad', start: 'whenever', end: null },
    ])

    expect(stops.map((stop) => stop.id)).toEqual(['good'])
  })

  it('keeps a job whose end precedes its start rather than dropping it', () => {
    const stops = timeline([{ id: 'reversed', start: '2024-06', end: '2023-01' }])

    expect(stops.map((stop) => stop.id)).toEqual(['reversed'])
  })
})
