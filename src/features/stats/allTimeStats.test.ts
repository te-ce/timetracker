import { describe, it, expect } from 'vitest'
import { buildAllTimeStats, formatClock, monthLabel, type StatsMonth } from './allTimeStats'
import { DEFAULT_WEEKDAY_HOURS } from '../../shared/weekdayHours'
import type { MonthData, WorkPeriod } from '../../infra/repositories/types'

function period(start: string, end: string | null, category = '_OTHER', id = `${start}-${end ?? 'open'}`): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

/** July 2026: Wed 1st 8h remote, Thu 2nd 9h office, Fri 3rd 6h. */
const JULY: MonthData = {
  '2026-07-01': { windows: [period('08:00', '16:00')], location: 'Remote' },
  '2026-07-02': { windows: [period('07:30', '16:30', '_COREMEDIA')], location: 'Office' },
  '2026-07-03': { windows: [period('09:00', '15:00')] },
}

function months(...entries: StatsMonth[]): StatsMonth[] {
  return entries
}

function stats(monthList: StatsMonth[], today = '2026-07-31', now = '18:00') {
  return buildAllTimeStats({ months: monthList, weekdayHours: DEFAULT_WEEKDAY_HOURS, today, now })
}

describe('buildAllTimeStats', () => {
  it('reports no data for an empty history', () => {
    const result = stats([])
    expect(result.hasData).toBe(false)
    expect(result.totalHours).toBe(0)
    expect(result.trackedDays).toBe(0)
    expect(result.longestDay).toBeNull()
    expect(result.longestStreak).toBeNull()
  })

  it('reports no data when stored months contain no tracked hours', () => {
    const result = stats(months({ ym: '2026-07', data: { '2026-07-01': { windows: [], note: 'nothing' } } }))
    expect(result.hasData).toBe(false)
  })

  it('totals hours and tracked days across months', () => {
    const result = stats(
      months(
        { ym: '2026-06', data: { '2026-06-30': { windows: [period('08:00', '12:00')] } } },
        { ym: '2026-07', data: JULY },
      ),
    )
    expect(result.totalHours).toBe(27)
    expect(result.trackedDays).toBe(4)
    expect(result.monthsTracked).toBe(2)
    expect(result.firstTrackedDate).toBe('2026-06-30')
    expect(result.lastTrackedDate).toBe('2026-07-03')
  })

  it('computes the all-time balance over tracked days only', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    // 8 + 9 + 6 worked against 3 × 8h target
    expect(result.balance).toBeCloseTo(-1)
  })

  it('averages hours per tracked day', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.avgHoursPerTrackedDay).toBeCloseTo(23 / 3)
  })

  it('finds the longest and shortest tracked day', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.longestDay).toEqual({ date: '2026-07-02', hours: 9 })
    expect(result.shortestTrackedDay).toEqual({ date: '2026-07-03', hours: 6 })
  })

  it('finds the earliest start and latest end with their dates', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.earliestStart).toEqual({ date: '2026-07-02', time: '07:30' })
    expect(result.latestEnd).toEqual({ date: '2026-07-02', time: '16:30' })
  })

  it('averages start and end across tracked days', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.avgStartMinutes).toBeCloseTo((480 + 450 + 540) / 3)
    expect(result.avgEndMinutes).toBeCloseTo((960 + 990 + 900) / 3)
  })

  it('counts a still-running period against now but leaves the end unknown', () => {
    const result = stats(
      months({ ym: '2026-07', data: { '2026-07-01': { windows: [period('08:00', null)] } } }),
      '2026-07-01',
      '12:30',
    )
    expect(result.totalHours).toBeCloseTo(4.5)
    expect(result.avgEndMinutes).toBeNull()
    expect(result.avgStartMinutes).toBe(480)
  })

  it('buckets hours by weekday and names the heaviest', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    const thursday = result.weekdays.find((w) => w.label === 'Thursday')
    expect(thursday).toMatchObject({ weekday: 4, hours: 9, trackedDays: 1, avgHours: 9 })
    expect(result.busiestWeekday?.label).toBe('Thursday')
    expect(result.weekdays.map((w) => w.label)[0]).toBe('Monday')
  })

  it('buckets hours by month and names the biggest', () => {
    const result = stats(
      months(
        { ym: '2026-06', data: { '2026-06-30': { windows: [period('08:00', '12:00')] } } },
        { ym: '2026-07', data: JULY },
      ),
    )
    expect(result.months.map((m) => m.ym)).toEqual(['2026-06', '2026-07'])
    expect(result.months[0]).toMatchObject({ label: 'June 2026', hours: 4, trackedDays: 1, balance: -4 })
    expect(result.busiestMonth?.ym).toBe('2026-07')
  })

  it('ranks categories by hours with a share of the total', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.categories[0]).toMatchObject({ category: '_OTHER', hours: 14 })
    expect(result.categories[1]?.category).toBe('_COREMEDIA')
    expect(result.categories[1]?.percent).toBeCloseTo((9 / 23) * 100)
  })

  it('counts periods and finds the longest unbroken stretch', () => {
    const data: MonthData = {
      '2026-07-01': { windows: [period('08:00', '10:00'), period('11:00', '17:00', '_SUPPORT')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.periodCount).toBe(2)
    expect(result.avgPeriodsPerTrackedDay).toBe(2)
    expect(result.longestPeriod).toEqual({
      date: '2026-07-01',
      hours: 6,
      category: '_SUPPORT',
      start: '11:00',
      end: '17:00',
    })
  })

  it('skips weekends when measuring the longest streak', () => {
    const data: MonthData = {}
    // Mon 6th – Fri 10th and Mon 13th July 2026
    for (const day of ['06', '07', '08', '09', '10', '13']) {
      data[`2026-07-${day}`] = { windows: [period('08:00', '16:00')] }
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.longestStreak).toEqual({ length: 6, from: '2026-07-06', to: '2026-07-13' })
  })

  it('breaks the streak on an untracked workday', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:00', '16:00')] },
      '2026-07-08': { windows: [period('08:00', '16:00')] },
      '2026-07-09': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.longestStreak).toEqual({ length: 2, from: '2026-07-08', to: '2026-07-09' })
  })

  it('does not let a streak span a gap in stored months', () => {
    const result = stats(
      months(
        { ym: '2026-05', data: { '2026-05-29': { windows: [period('08:00', '16:00')] } } },
        { ym: '2026-07', data: { '2026-07-01': { windows: [period('08:00', '16:00')] } } },
      ),
    )
    expect(result.longestStreak?.length).toBe(1)
  })

  it('counts the current streak back from today', () => {
    const data: MonthData = {
      '2026-07-01': { windows: [period('08:00', '16:00')] },
      '2026-07-02': { windows: [period('08:00', '16:00')] },
      '2026-07-03': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }), '2026-07-03')
    expect(result.currentStreak).toBe(3)
  })

  it('keeps the current streak alive while today is still untracked', () => {
    const data: MonthData = {
      '2026-07-01': { windows: [period('08:00', '16:00')] },
      '2026-07-02': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }), '2026-07-03')
    expect(result.currentStreak).toBe(2)
  })

  it('reports a zero current streak once a workday was missed', () => {
    const data: MonthData = { '2026-07-01': { windows: [period('08:00', '16:00')] } }
    const result = stats(months({ ym: '2026-07', data }), '2026-07-06')
    expect(result.currentStreak).toBe(0)
  })

  it('splits tracked days by office location', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.location).toEqual({ officeDays: 1, remoteDays: 2, officePercent: 33 })
  })

  it('counts leave days and days worked off schedule', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [], dayTypeOverride: 'Vacation' },
      '2026-07-07': { windows: [], dayTypeOverride: 'SickDay' },
      // Saturday
      '2026-07-04': { windows: [period('10:00', '13:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.vacationDays).toBe(1)
    expect(result.sickDays).toBe(1)
    expect(result.daysWorkedOffSchedule).toBe(1)
  })

  it('counts days that met or beat their target', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.daysAtOrOverTarget).toBe(2)
  })

  it('measures the calendar span between the first and last tracked day', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.calendarSpanDays).toBe(3)
  })

  it('caps an unclosed period on a past day at end of day rather than dropping it', () => {
    const result = stats(
      months({ ym: '2026-07', data: { '2026-07-01': { windows: [period('08:00', null)] } } }),
      '2026-07-10',
    )
    expect(result.totalHours).toBeGreaterThan(15)
    expect(result.longestPeriod).toBeNull()
  })
})

describe('monthLabel', () => {
  it('renders a YYYY-MM key as month and year', () => {
    expect(monthLabel('2026-07')).toBe('July 2026')
  })
})

describe('formatClock', () => {
  it('renders minutes after midnight as HH:MM', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(497.6)).toBe('08:18')
  })
})
