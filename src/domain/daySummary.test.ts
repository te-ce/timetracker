import { describe, it, expect } from 'vitest'
import { buildMonthSummaries } from './daySummary'
import type { MonthData } from '../repositories/types'

describe('buildMonthSummaries', () => {
  const today = '2026-05-19'

  it('produces one summary per day in the month', () => {
    const result = buildMonthSummaries(2026, 5, { monthData: {}, today })

    expect(result.days).toHaveLength(31)
    expect(result.days[0]!.date).toBe('2026-05-01')
    expect(result.days[30]!.date).toBe('2026-05-31')
  })

  it('computes workedHours from windows', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [],
        windows: [
          { id: '1', start: '09:00', end: '12:00' },
          { id: '2', start: '13:00', end: '17:00' },
        ],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.workedHours).toBe(7)
  })

  it('computes entryTotal from time entries', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [
          { id: '1', category: 'QA', hours: 3 },
          { id: '2', category: 'Support', hours: 2 },
        ],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.entryTotal).toBe(5)
  })

  it('marks balanced when entries match worked hours', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [{ id: '1', category: 'QA', hours: 8 }],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.isEntriesBalanced).toBe(true)
    expect(result.days[0]!.dayStatus).toBe('tracked')
  })

  it('marks needs-review when entries do not match worked hours', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [{ id: '1', category: 'QA', hours: 3 }],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.isEntriesBalanced).toBe(false)
    expect(result.days[0]!.dayStatus).toBe('needs-review')
  })

  it('marks needs-review when auto category covers remaining but day is not confirmed', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [{ id: '1', category: 'QA', hours: 3 }],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today, globalAutoCategory: 'Internal' })
    expect(result.days[0]!.dayStatus).toBe('needs-review')
  })

  it('marks needs-review when entries exceed worked hours even with auto category', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [{ id: '1', category: 'QA', hours: 10 }],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today, globalAutoCategory: 'Internal' })
    expect(result.days[0]!.dayStatus).toBe('needs-review')
  })

  it('respects dayTypeOverrides for non-working days', () => {
    const monthData: MonthData = {
      '2026-05-01': { entries: [], windows: [], dayTypeOverride: 'Vacation' },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.dayType).toBe('Vacation')
    expect(result.days[0]!.dayStatus).toBe('leave')
  })

  it('counts only WorkDays in workDayCount', () => {
    const monthData: MonthData = {
      '2026-05-01': { entries: [], windows: [], dayTypeOverride: 'Vacation' },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    // May 2026: 1=Thu (overridden to Vacation), weekends are 3-4,10-11,17-18,24-25,31
    // Without override: 21 workdays. With override: 20.
    expect(result.workDayCount).toBe(20)
  })

  it('returns hasAnyTrackedHours correctly', () => {
    const empty = buildMonthSummaries(2026, 5, { monthData: {}, today })
    expect(empty.hasAnyTrackedHours).toBe(false)

    const withHours = buildMonthSummaries(2026, 5, {
      monthData: { '2026-05-01': { entries: [], windows: [{ id: 'w1', start: '09:00', end: '10:00' }] } },
      today,
    })
    expect(withHours.hasAnyTrackedHours).toBe(true)
  })

  it('marks today with today status', () => {
    const monthData: MonthData = {
      '2026-05-19': {
        entries: [{ id: '1', category: 'QA', hours: 8 }],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[18]!.dayStatus).toBe('today')
  })
})
