import { describe, it, expect } from 'vitest'
import { buildMonthOverview } from './monthOverview'
import type { DaySummary } from './daySummary'

function daySummary(date: string, overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    date,
    dayType: 'WorkDay',
    workedHours: 8,
    entryTotal: 0,

    dayStatus: 'complete',
    displayStatus: 'complete',
    statusReason: '',
    categoryBreakdown: {},
    ...overrides,
  }
}

describe('buildMonthOverview', () => {
  it('groups the month into ISO weeks with worked hours and week balance', () => {
    // July 2026: 1st is a Wednesday, so KW 27 holds Wed 1 – Sun 5.
    const days = [
      daySummary('2026-07-01', { workedHours: 9 }),
      daySummary('2026-07-02', { workedHours: 7 }),
      daySummary('2026-07-03', { workedHours: 8 }),
      daySummary('2026-07-04', { workedHours: 0, dayType: 'Weekend', displayStatus: 'non-working' }),
      daySummary('2026-07-05', { workedHours: 0, dayType: 'Weekend', displayStatus: 'non-working' }),
      daySummary('2026-07-06', { workedHours: 8 }),
    ]
    const overview = buildMonthOverview({
      days,
      targetHoursPerDay: [8, 8, 8, 0, 0, 8],
      today: '2026-07-31',
      cumulativeBalance: 0,
    })

    expect(overview.weeks.map((w) => w.isoWeek)).toEqual([27, 28])
    const [first] = overview.weeks
    expect(first?.days.map((d) => d.dayOfMonth)).toEqual([1, 2, 3, 4, 5])
    expect(first?.worked).toBe(24)
    expect(first?.balance).toBe(0)
  })

  it('counts week target only for days with tracked hours, matching how overtime is derived', () => {
    const days = [
      daySummary('2026-07-01', { workedHours: 6 }),
      daySummary('2026-07-02', { workedHours: 0, displayStatus: 'untracked', dayStatus: 'untracked' }),
    ]
    const overview = buildMonthOverview({
      days,
      targetHoursPerDay: [8, 8],
      today: '2026-07-31',
      cumulativeBalance: 0,
    })

    expect(overview.weeks[0]?.target).toBe(8)
    expect(overview.weeks[0]?.balance).toBe(-2)
  })

  it('marks a week whose every day is still to come, so it can be left blank', () => {
    const overview = buildMonthOverview({
      days: [
        daySummary('2026-07-01', { workedHours: 8 }),
        daySummary('2026-07-02', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
        // Next ISO week, entirely in the future.
        daySummary('2026-07-06', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
        daySummary('2026-07-07', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
      ],
      targetHoursPerDay: [8, 8, 8, 8],
      today: '2026-07-01',
      cumulativeBalance: 0,
    })

    expect(overview.weeks.map((w) => w.isFuture)).toEqual([false, true])
  })

  it('gives each day its own hours, target and balance, and no balance where none is knowable', () => {
    const days = [
      daySummary('2026-07-01', { workedHours: 9.5 }),
      daySummary('2026-07-02', { workedHours: 0, displayStatus: 'untracked', dayStatus: 'untracked' }),
      daySummary('2026-07-03', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
    ]
    const overview = buildMonthOverview({
      days,
      targetHoursPerDay: [8, 8, 8],
      today: '2026-07-02',
      cumulativeBalance: 0,
    })
    const [first, second, third] = overview.weeks[0]?.days ?? []

    expect(first?.workedHours).toBe(9.5)
    expect(first?.targetHours).toBe(8)
    expect(first?.balance).toBe(1.5)
    // Nothing tracked and a day still to come are both "no balance yet", not "−8h".
    expect(second?.balance).toBeNull()
    expect(third?.balance).toBeNull()
  })

  it('carries a cumulative overtime-to-date across days and into the week, seeded by prior months', () => {
    const days = [
      daySummary('2026-07-01', { workedHours: 9 }),
      daySummary('2026-07-02', { workedHours: 6 }),
      daySummary('2026-07-03', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
    ]
    const overview = buildMonthOverview({
      days,
      targetHoursPerDay: [8, 8, 8],
      today: '2026-07-02',
      cumulativeBalance: 5,
    })
    const [first, second, third] = overview.weeks[0]?.days ?? []

    expect(first?.overtimeToDate).toBe(6) // 5 + (9 - 8)
    expect(second?.overtimeToDate).toBe(4) // 6 + (6 - 8)
    expect(third?.overtimeToDate).toBeNull()
    expect(overview.weeks[0]?.overtimeToDate).toBe(4)
  })

  it('caps a day fill at its target so an overtime day does not overflow the bar', () => {
    const overview = buildMonthOverview({
      days: [daySummary('2026-07-01', { workedHours: 12 }), daySummary('2026-07-02', { workedHours: 4 })],
      targetHoursPerDay: [8, 8],
      today: '2026-07-31',
      cumulativeBalance: 0,
    })
    const [over, under] = overview.weeks[0]?.days ?? []

    expect(over?.fillPercent).toBe(100)
    expect(under?.fillPercent).toBe(50)
  })

  it('totals the month against its full target and marks how much of that target is already due', () => {
    const days = [
      daySummary('2026-07-01', { workedHours: 6 }),
      daySummary('2026-07-02', { workedHours: 4 }),
      daySummary('2026-07-03', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
      daySummary('2026-07-04', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
    ]
    const overview = buildMonthOverview({
      days,
      targetHoursPerDay: [8, 8, 8, 8],
      today: '2026-07-02',
      cumulativeBalance: -12,
    })

    expect(overview.worked).toBe(10)
    expect(overview.targetFullMonth).toBe(32)
    expect(overview.workedPercent).toBe(31.25)
    // Two of four days are done, so half the month's target is due.
    expect(overview.targetToDatePercent).toBe(50)
    expect(overview.cumulativeBalance).toBe(-12)
  })

  it('lists the days needing attention in date order, with why, and the hours still missing', () => {
    const days = [
      daySummary('2026-07-01', { workedHours: 8 }),
      daySummary('2026-07-02', { workedHours: 0, displayStatus: 'untracked', dayStatus: 'untracked' }),
      daySummary('2026-07-03', {
        workedHours: 5,
        displayStatus: 'needs-review',
        dayStatus: 'needs-review',
        statusReason: 'Entries do not add up',
      }),
      // A future workday is not yet a problem.
      daySummary('2026-07-06', { workedHours: 0, displayStatus: 'future', dayStatus: 'future' }),
    ]
    const overview = buildMonthOverview({
      days,
      targetHoursPerDay: [8, 8, 8, 8],
      today: '2026-07-03',
      cumulativeBalance: 0,
    })

    expect(overview.attention.map((a) => [a.date, a.reason])).toEqual([
      ['2026-07-02', 'Nothing tracked'],
      ['2026-07-03', 'Entries do not add up'],
    ])
    expect(overview.untrackedCount).toBe(1)
    expect(overview.needsReviewCount).toBe(1)
    expect(overview.missingHours).toBe(8)
  })

  it('falls back to a generic reason when a day needing review has none', () => {
    const overview = buildMonthOverview({
      days: [daySummary('2026-07-01', { displayStatus: 'needs-review', dayStatus: 'needs-review', statusReason: '' })],
      targetHoursPerDay: [8],
      today: '2026-07-01',
      cumulativeBalance: 0,
    })

    expect(overview.attention[0]?.reason).toBe('Needs review')
  })

  it('keeps the leave type on the day, so a vacation cell can say so instead of showing no hours', () => {
    const overview = buildMonthOverview({
      days: [
        daySummary('2026-07-01', {
          workedHours: 0,
          dayType: 'Vacation',
          dayStatus: 'leave',
          displayStatus: 'leave',
          leaveType: 'Vacation',
        }),
      ],
      targetHoursPerDay: [8],
      today: '2026-07-01',
      cumulativeBalance: 0,
    })

    expect(overview.weeks[0]?.days[0]?.leaveType).toBe('Vacation')
    // Leave is not an untracked gap.
    expect(overview.attention).toEqual([])
  })
})
