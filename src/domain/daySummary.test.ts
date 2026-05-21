import { describe, it, expect } from 'vitest'
import { buildMonthSummaries } from './daySummary'

describe('buildMonthSummaries', () => {
  const today = '2026-05-19'

  it('produces one summary per day in the month', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [],
      entries: [],
      dayTypeOverrides: new Map(),
      today,
    })

    expect(result.days).toHaveLength(31)
    expect(result.days[0].date).toBe('2026-05-01')
    expect(result.days[30].date).toBe('2026-05-31')
  })

  it('computes workedHours from windows', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [
        { id: '1', date: '2026-05-01', start: '09:00', end: '12:00' },
        { id: '2', date: '2026-05-01', start: '13:00', end: '17:00' },
      ],
      entries: [],
      dayTypeOverrides: new Map(),
      today,
    })

    expect(result.days[0].workedHours).toBe(7)
  })

  it('computes entryTotal from time entries', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      entries: [
        { id: '1', date: '2026-05-01', category: 'QA', hours: 3 },
        { id: '2', date: '2026-05-01', category: 'Support', hours: 2 },
      ],
      dayTypeOverrides: new Map(),
      today,
    })

    expect(result.days[0].entryTotal).toBe(5)
  })

  it('marks balanced when entries match worked hours', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      entries: [{ id: '1', date: '2026-05-01', category: 'QA', hours: 8 }],
      dayTypeOverrides: new Map(),
      today,
    })

    expect(result.days[0].isEntriesBalanced).toBe(true)
    expect(result.days[0].dayStatus).toBe('complete')
  })

  it('marks incomplete when entries do not match worked hours', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      entries: [{ id: '1', date: '2026-05-01', category: 'QA', hours: 3 }],
      dayTypeOverrides: new Map(),
      today,
    })

    expect(result.days[0].isEntriesBalanced).toBe(false)
    expect(result.days[0].dayStatus).toBe('incomplete')
  })

  it('marks complete when auto category absorbs remaining hours', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      entries: [{ id: '1', date: '2026-05-01', category: 'QA', hours: 3 }],
      dayTypeOverrides: new Map(),
      today,
      globalAutoCategory: 'Internal',
    })

    expect(result.days[0].dayStatus).toBe('complete')
  })

  it('marks incomplete when entries exceed worked hours even with auto category', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      entries: [{ id: '1', date: '2026-05-01', category: 'QA', hours: 10 }],
      dayTypeOverrides: new Map(),
      today,
      globalAutoCategory: 'Internal',
    })

    expect(result.days[0].dayStatus).toBe('incomplete')
  })

  it('respects dayTypeOverrides for non-working days', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [],
      entries: [],
      dayTypeOverrides: new Map([['2026-05-01', 'Vacation']]),
      today,
    })

    expect(result.days[0].dayType).toBe('Vacation')
    expect(result.days[0].dayStatus).toBe('leave')
  })

  it('counts only WorkDays in workDayCount', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [],
      entries: [],
      dayTypeOverrides: new Map([['2026-05-01', 'Vacation']]),
      today,
    })

    // May 2026: 1=Thu (overridden to Vacation), weekends are 3-4,10-11,17-18,24-25,31-1
    // Without override: 21 workdays. With override: 20.
    expect(result.workDayCount).toBe(20)
  })

  it('returns hasAnyTrackedHours correctly', () => {
    const empty = buildMonthSummaries(2026, 5, {
      windows: [],
      entries: [],
      dayTypeOverrides: new Map(),
      today,
    })
    expect(empty.hasAnyTrackedHours).toBe(false)

    const withHours = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '10:00' }],
      entries: [],
      dayTypeOverrides: new Map(),
      today,
    })
    expect(withHours.hasAnyTrackedHours).toBe(true)
  })

  it('marks today with today status', () => {
    const result = buildMonthSummaries(2026, 5, {
      windows: [{ id: 'w1', date: '2026-05-19', start: '09:00', end: '17:00' }],
      entries: [{ id: '1', date: '2026-05-19', category: 'QA', hours: 8 }],
      dayTypeOverrides: new Map(),
      today,
    })

    expect(result.days[18].dayStatus).toBe('today')
  })
})
