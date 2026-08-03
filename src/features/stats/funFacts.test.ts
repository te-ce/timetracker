import { describe, it, expect } from 'vitest'
import { buildAllTimeStats } from './allTimeStats'
import { buildFunFacts, formatFactDate } from './funFacts'
import { DEFAULT_WEEKDAY_HOURS } from '../../shared/weekdayHours'
import type { MonthData } from '../../infra/repositories/types'

function factsFor(data: MonthData, today = '2026-07-31') {
  const stats = buildAllTimeStats({
    months: [{ ym: '2026-07', data }],
    weekdayHours: DEFAULT_WEEKDAY_HOURS,
    today,
    now: '18:00',
  })
  return buildFunFacts(stats, 'decimal')
}

function textOf(data: MonthData, id: string, today?: string): string | undefined {
  return factsFor(data, today).find((f) => f.id === id)?.text
}

const WEEK: MonthData = {
  '2026-07-06': { windows: [{ id: 'a', start: '08:00', end: '16:00', category: '_OTHER', subtasks: [] }] },
  '2026-07-07': { windows: [{ id: 'b', start: '07:15', end: '17:45', category: '_COREMEDIA', subtasks: [] }] },
  '2026-07-08': { windows: [{ id: 'c', start: '09:00', end: '15:00', category: '_OTHER', subtasks: [] }] },
}

describe('buildFunFacts', () => {
  it('returns nothing when there is no tracked data', () => {
    expect(factsFor({})).toEqual([])
  })

  it('always leads with the total-time fact', () => {
    expect(factsFor(WEEK)[0]?.id).toBe('full-days')
    expect(textOf(WEEK, 'full-days')).toContain('full 24-hour days')
  })

  it('reports the longest streak with its date range', () => {
    expect(textOf(WEEK, 'longest-streak')).toBe(
      'Longest run: 3 tracked workdays in a row, Mon, 6 Jul 2026 → Wed, 8 Jul 2026.',
    )
  })

  it('omits the current-streak fact when the streak is a single day', () => {
    const oneDay: MonthData = { '2026-07-06': WEEK['2026-07-06'] ?? { windows: [] } }
    expect(textOf(oneDay, 'current-streak', '2026-07-06')).toBeUndefined()
  })

  it('names the heaviest weekday with its average', () => {
    expect(textOf(WEEK, 'busiest-weekday')).toContain('Tuesday')
    expect(textOf(WEEK, 'busiest-weekday')).toContain('10.50h')
  })

  it('reports the earliest start and latest finish', () => {
    expect(textOf(WEEK, 'early-bird')).toBe('Earliest start ever: 07:15 on Tue, 7 Jul 2026.')
    expect(textOf(WEEK, 'night-owl')).toBe('Latest finish ever: 17:45 on Tue, 7 Jul 2026.')
  })

  it('reports the typical day as an average start and end', () => {
    expect(textOf(WEEK, 'rhythm')).toBe('Your typical day runs 08:05 → 16:15.')
  })

  it('names the top category with its share', () => {
    expect(textOf(WEEK, 'top-category')).toBe("_OTHER takes the biggest slice — 57% of everything you've tracked.")
  })

  it('reports the target hit rate over tracked days', () => {
    expect(textOf(WEEK, 'target-hit-rate')).toBe('You hit or beat the daily target on 67% of tracked days.')
  })

  it('mentions off-schedule days only when some exist', () => {
    expect(textOf(WEEK, 'off-schedule')).toBeUndefined()
    const withSaturday: MonthData = {
      ...WEEK,
      '2026-07-04': { windows: [{ id: 'd', start: '10:00', end: '13:00', category: '_OTHER', subtasks: [] }] },
    }
    expect(textOf(withSaturday, 'off-schedule')).toContain('1 day tracked outside your normal schedule')
  })

  it('mentions the office split only when office days exist', () => {
    expect(textOf(WEEK, 'office-split')).toBeUndefined()
    const withOffice: MonthData = {
      ...WEEK,
      '2026-07-06': { ...WEEK['2026-07-06'], windows: WEEK['2026-07-06']?.windows ?? [], location: 'Office' },
    }
    expect(textOf(withOffice, 'office-split')).toContain('33% of tracked days were in the office')
  })

  it('reports recorded time off', () => {
    const withLeave: MonthData = { ...WEEK, '2026-07-09': { windows: [], dayTypeOverride: 'Vacation' } }
    expect(textOf(withLeave, 'time-off')).toBe('Time off on record: 1 vacation day and 0 sick days.')
  })

  it('reports coverage once the tracked days are sparser than the calendar span', () => {
    expect(textOf(WEEK, 'coverage')).toBeUndefined()
    const withLaterDay: MonthData = {
      ...WEEK,
      '2026-07-15': { windows: [{ id: 'e', start: '08:00', end: '16:00', category: '_OTHER', subtasks: [] }] },
    }
    expect(textOf(withLaterDay, 'coverage')).toBe("You've tracked 4 of the 10 calendar days since Mon, 6 Jul 2026.")
  })
})

describe('formatFactDate', () => {
  it('renders an ISO date as weekday, day, month, year', () => {
    expect(formatFactDate('2026-07-06')).toBe('Mon, 6 Jul 2026')
  })
})
