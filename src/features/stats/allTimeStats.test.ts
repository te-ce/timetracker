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

  it('skips weekends when measuring the longest streak', () => {
    const data: MonthData = {}
    // Mon 6th – Fri 10th and Mon 13th July 2026
    for (const day of ['06', '07', '08', '09', '10', '13']) {
      data[`2026-07-${day}`] = { windows: [period('08:00', '16:00')] }
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.longestStreak).toEqual({ length: 6, from: '2026-07-06', to: '2026-07-13' })
  })

  it('breaks the streak on a vacation or sick day', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:00', '16:00')] },
      '2026-07-07': { windows: [period('08:00', '16:00')] },
      '2026-07-08': { windows: [], dayTypeOverride: 'Vacation' },
      '2026-07-09': { windows: [period('08:00', '16:00')] },
      '2026-07-10': { windows: [period('08:00', '16:00')] },
      '2026-07-13': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.longestStreak).toEqual({ length: 3, from: '2026-07-09', to: '2026-07-13' })
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

describe('buildAllTimeStats periods', () => {
  it('finds the longest unbroken stretch', () => {
    const data: MonthData = {
      '2026-07-01': { windows: [period('08:00', '10:00'), period('11:00', '17:00', '_SUPPORT')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.longestPeriod).toEqual({
      date: '2026-07-01',
      hours: 6,
      category: '_SUPPORT',
      start: '11:00',
      end: '17:00',
    })
  })
})

describe('buildAllTimeStats rhythm', () => {
  it('names the quarter-hour slot started in most often', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:02', '16:00')] },
      '2026-07-07': { windows: [period('07:58', '16:00')] },
      '2026-07-08': { windows: [period('09:30', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.rhythm.mostCommonStartSlot).toBe('08:00')
    expect(result.rhythm.mostCommonStartCount).toBe(2)
  })

  it('measures how far the start time strays from the average', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:00', '16:00')] },
      '2026-07-07': { windows: [period('09:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.rhythm.startSpreadMinutes).toBeCloseTo(30)
  })

  it('counts starts before 08:00 and finishes from 18:00 on', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('07:00', '18:00')] },
      '2026-07-07': { windows: [period('08:00', '17:59')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.rhythm.earlyStarts).toBe(1)
    expect(result.rhythm.lateFinishes).toBe(1)
  })
})

describe('buildAllTimeStats breaks', () => {
  it('averages the gaps between periods across tracked days', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:00', '12:00'), period('12:30', '16:00')] },
      '2026-07-07': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.breaks.avgMinutesPerDay).toBeCloseTo(15)
    expect(result.breaks.longestWithinDay).toEqual({ date: '2026-07-06', minutes: 30 })
    expect(result.breaks.daysWithoutBreak).toBe(1)
  })

  it('averages when the main break of a day falls', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:00', '12:00'), period('12:40', '17:00')] },
      '2026-07-07': { windows: [period('08:00', '12:20'), period('13:00', '17:00')] },
      // No break at all — must not drag the window earlier.
      '2026-07-08': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.breaks.usualStartMinutes).toBe(12 * 60 + 10)
    expect(result.breaks.usualEndMinutes).toBe(12 * 60 + 50)
  })

  it('leaves the usual break window unset when no day has a gap', () => {
    const data: MonthData = { '2026-07-06': { windows: [period('08:00', '16:00')] } }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.breaks.usualStartMinutes).toBeNull()
    expect(result.breaks.usualEndMinutes).toBeNull()
  })

  it('reads periods in clock order even when stored out of order', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('13:00', '17:00', '_OTHER', 'p2'), period('08:00', '12:00', '_OTHER', 'p1')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.breaks.longestWithinDay).toEqual({ date: '2026-07-06', minutes: 60 })
  })
})

describe('buildAllTimeStats weeks', () => {
  it('finds the biggest ISO week', () => {
    const data: MonthData = {
      '2026-07-06': { windows: [period('08:00', '16:00')] },
      '2026-07-07': { windows: [period('08:00', '16:00')] },
      '2026-07-13': { windows: [period('08:00', '12:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.weeks.bestWeek).toMatchObject({ isoWeek: 28, isoYear: 2026, hours: 16, trackedDays: 2 })
    expect(result.weeks.bestWeek?.label).toBe('Week 28, 2026')
  })
})

describe('buildAllTimeStats extremes', () => {
  it('finds the biggest surplus and shortfall day', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.extremes.bestDayBalance).toEqual({ date: '2026-07-02', balance: 1 })
    expect(result.extremes.worstDayBalance).toEqual({ date: '2026-07-03', balance: -2 })
  })

  it('takes the median of tracked day lengths', () => {
    const result = stats(months({ ym: '2026-07', data: JULY }))
    expect(result.extremes.medianDayHours).toBe(8)
  })

  it('totals hours that landed on a weekend', () => {
    const data: MonthData = {
      // Sat 4th and Sun 5th July 2026
      '2026-07-04': { windows: [period('10:00', '13:00')] },
      '2026-07-05': { windows: [period('10:00', '11:00')] },
      '2026-07-06': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.extremes.weekendHours).toBe(4)
  })

  it('finds the longest run of untracked workdays', () => {
    const data: MonthData = {
      '2026-07-01': { windows: [period('08:00', '16:00')] },
      '2026-07-08': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }), '2026-07-08')
    // Thu 2nd, Fri 3rd, Mon 6th, Tue 7th — weekends skipped, not counted
    expect(result.extremes.longestAbsence).toEqual({ workdays: 4, from: '2026-07-02', to: '2026-07-07' })
  })

  it('leaves the absence unset when no past workday was missed', () => {
    const data: MonthData = { '2026-07-01': { windows: [period('08:00', '16:00')] } }
    const result = stats(months({ ym: '2026-07', data }), '2026-07-01')
    expect(result.extremes.longestAbsence).toBeNull()
  })
})

describe('buildAllTimeStats discipline', () => {
  it('counts notes and subtasks', () => {
    const data: MonthData = {
      '2026-07-06': {
        windows: [
          {
            id: 'w1',
            start: '08:00',
            end: '16:00',
            category: '_COREMEDIA',
            subtasks: [{ id: 's1', category: '_SUPPORT', hours: 2 }],
          },
        ],
        confirmed: true,
        note: 'shipped the thing',
      },
      '2026-07-07': { windows: [period('08:00', '16:00')] },
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.discipline).toEqual({ daysWithNotes: 1, subtaskCount: 1 })
  })

  it('ignores a note that is only whitespace', () => {
    const data: MonthData = { '2026-07-06': { windows: [period('08:00', '16:00')], note: '   ' } }
    expect(stats(months({ ym: '2026-07', data })).discipline.daysWithNotes).toBe(0)
  })
})

describe('buildAllTimeStats milestones', () => {
  it('counts down to the next whole hundred hours', () => {
    const data: MonthData = { '2026-07-06': { windows: [period('08:00', '16:00')] } }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.nextMilestone).toBe(100)
    expect(result.hoursToNextMilestone).toBe(92)
  })

  it('steps to the following hundred once the first is passed', () => {
    const data: MonthData = {}
    // 13 workdays × 8h = 104h
    for (const day of ['01', '02', '03', '06', '07', '08', '09', '10', '13', '14', '15', '16', '17']) {
      data[`2026-07-${day}`] = { windows: [period('08:00', '16:00')] }
    }
    const result = stats(months({ ym: '2026-07', data }))
    expect(result.totalHours).toBe(104)
    expect(result.nextMilestone).toBe(200)
    expect(result.hoursToNextMilestone).toBe(96)
  })

  it('measures how long tracking has been going', () => {
    const data: MonthData = { '2026-07-06': { windows: [period('08:00', '16:00')] } }
    expect(stats(months({ ym: '2026-07', data }), '2026-07-10').trackingSinceDays).toBe(5)
  })
})
