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

/** Mon 6th – Wed 8th July 2026 with a lunch break, a note, a confirmation and a subtask. */
const RICH: MonthData = {
  '2026-07-06': {
    windows: [
      { id: 'a1', start: '08:00', end: '12:00', category: '_OTHER', subtasks: [] },
      { id: 'a2', start: '12:30', end: '17:00', category: '_OTHER', subtasks: [] },
    ],
    confirmed: true,
    note: 'long day',
  },
  '2026-07-07': {
    windows: [
      {
        id: 'b1',
        start: '07:15',
        end: '17:45',
        category: '_COREMEDIA',
        subtasks: [{ id: 's1', category: '_SUPPORT', hours: 2 }],
      },
    ],
  },
  '2026-07-08': { windows: [{ id: 'c1', start: '08:05', end: '15:00', category: '_OTHER', subtasks: [] }] },
}

describe('buildFunFacts rhythm and breaks', () => {
  it('names the usual start slot', () => {
    expect(textOf(RICH, 'favourite-start')).toBe('You start around 08:00 more often than any other time — 2 days.')
  })

  it('describes how much the start time moves', () => {
    expect(textOf(RICH, 'start-consistency')).toContain('Your start time swings by about ±')
  })

  it('counts early starts, and late finishes only from 18:00 on', () => {
    expect(textOf(RICH, 'early-starts')).toBe('1 day you were already going before 08:00.')
    expect(textOf(RICH, 'late-finishes')).toBeUndefined()

    const withLateNight: MonthData = {
      ...RICH,
      '2026-07-09': { windows: [{ id: 'e1', start: '10:00', end: '18:30', category: '_OTHER', subtasks: [] }] },
    }
    expect(textOf(withLateNight, 'late-finishes')).toBe('1 day ran past 18:00.')
  })

  it('reports the average and longest break', () => {
    expect(textOf(RICH, 'avg-break')).toBe('You step away for 10 min on an average tracked day.')
    expect(textOf(RICH, 'longest-break')).toBe('Longest single break: 30 min on Mon, 6 Jul 2026.')
  })

  it('counts days logged as one unbroken period', () => {
    expect(textOf(RICH, 'no-break-days')).toContain('2 days went down as one unbroken period')
  })
})

describe('buildFunFacts weeks and extremes', () => {
  it('reports the biggest and average week', () => {
    expect(textOf(RICH, 'best-week')).toBe('Biggest week: Week 28, 2026 with 25.92h over 3 days.')
    expect(textOf(RICH, 'avg-week')).toBe('An average tracked week comes to 25.92h.')
  })

  it('reports the perfect-week ratio only once a week has finished', () => {
    expect(textOf(RICH, 'perfect-weeks', '2026-07-08')).toBeUndefined()
    expect(textOf(RICH, 'perfect-weeks')).toBe('0 of 3 finished weeks had every single workday tracked.')
  })

  it('reports the median day and the day extremes', () => {
    expect(textOf(RICH, 'median-day')).toBe('Half your tracked days run longer than 8.50h.')
    expect(textOf(RICH, 'best-day-balance')).toBe('Biggest surplus in one day: +2.50h on Tue, 7 Jul 2026.')
    expect(textOf(RICH, 'worst-day-balance')).toBe('Biggest shortfall in one day: −1.08h on Wed, 8 Jul 2026.')
  })

  it('reports the longest stretch with nothing tracked', () => {
    expect(textOf(RICH, 'longest-absence', '2026-07-31')).toContain('Longest stretch with nothing tracked:')
  })

  it('mentions weekend hours only when some exist', () => {
    expect(textOf(RICH, 'weekend-hours')).toBeUndefined()
    const withSunday: MonthData = {
      ...RICH,
      '2026-07-05': { windows: [{ id: 'd1', start: '10:00', end: '12:00', category: '_OTHER', subtasks: [] }] },
    }
    expect(textOf(withSunday, 'weekend-hours')).toBe('2.00h of your tracked time landed on a weekend.')
  })
})

describe('buildFunFacts discipline', () => {
  it('reports confirmations, categories, subtasks and notes', () => {
    expect(textOf(RICH, 'confirmed')).toBe('33% of your tracked days are confirmed (1 of 3).')
    expect(textOf(RICH, 'category-spread')).toBe(
      "You've booked time to 3 different categories, and 2 days ran on a single one.",
    )
    expect(textOf(RICH, 'subtasks')).toBe('1 subtask carved out of your work periods.')
    expect(textOf(RICH, 'notes')).toBe('1 day carry a note.')
  })

  it('reports how long tracking has been going and the next milestone', () => {
    expect(textOf(RICH, 'tracking-since', '2026-07-10')).toBe("You've been tracking for 5 days, since Mon, 6 Jul 2026.")
    expect(textOf(RICH, 'next-milestone')).toBe('74.1h to go until 100 hours tracked.')
  })
})
