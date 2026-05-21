import { describe, it, expect } from 'vitest'
import { buildMonthGrid } from './monthGrid'

describe('buildMonthGrid', () => {
  it('produces one row per day in the month', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [],
      workPeriods: [],
      dayTypes: new Map(),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
    })

    expect(rows).toHaveLength(31) // May has 31 days
    expect(rows[0].date).toBe('2026-05-01')
    expect(rows[30].date).toBe('2026-05-31')
  })

  it('calculates workedHours from WorkPeriods per day', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [],
      workPeriods: [
        { id: '1', date: '2026-05-01', start: '09:00', end: '12:00' },
        { id: '2', date: '2026-05-01', start: '13:00', end: '17:00' },
        { id: '3', date: '2026-05-02', start: '08:00', end: '16:30' },
      ],
      dayTypes: new Map(),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
    })

    expect(rows[0].workedHours).toBe(7) // 3 + 4
    expect(rows[1].workedHours).toBe(8.5)
    expect(rows[2].workedHours).toBe(0) // no windows
  })

  it('groups time entries by category per day', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [
        { id: '1', date: '2026-05-01', category: 'QA', hours: 2 },
        { id: '2', date: '2026-05-01', category: 'Support', hours: 1.5 },
        { id: '3', date: '2026-05-01', category: 'QA', hours: 1 },
        { id: '4', date: '2026-05-02', category: 'Infra', hours: 4 },
      ],
      workPeriods: [],
      dayTypes: new Map(),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
    })

    expect(rows[0].entries).toEqual({ QA: 3, Support: 1.5 })
    expect(rows[1].entries).toEqual({ Infra: 4 })
  })

  it('computes autoCategoryHours as workedHours minus manual entries', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [
        { id: '1', date: '2026-05-01', category: 'QA', hours: 2 },
        { id: '2', date: '2026-05-01', category: 'Support', hours: 1 },
      ],
      workPeriods: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      dayTypes: new Map(),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
    })

    expect(rows[0].workedHours).toBe(8)
    expect(rows[0].autoCategoryHours).toBe(5) // 8 - 2 - 1
  })

  it('flags unaccounted hours when entries + auto < workedHours with override', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [{ id: '1', date: '2026-05-01', category: 'QA', hours: 2 }],
      workPeriods: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      dayTypes: new Map(),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
      autoCategoryManualValues: new Map([['2026-05-01', 3]]),
    })

    // WorkedHours=8, manual=2, autoOverride=3 → total=5 < 8 → unaccounted
    expect(rows[0].autoCategoryOverride).toBe(3)
    expect(rows[0].autoCategoryHours).toBe(3)
    expect(rows[0].hasUnaccountedHours).toBe(true)
  })

  it('classifies weekends automatically', () => {
    // 2026-05-02 is a Saturday? Let me pick 2026-05-03 which is Sunday
    // Actually May 2026: 1=Fri, 2=Sat, 3=Sun
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [],
      workPeriods: [],
      dayTypes: new Map(),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
    })

    expect(rows[0].dayType).toBe('WorkDay') // May 1 = Friday
    expect(rows[1].dayType).toBe('Weekend') // May 2 = Saturday
    expect(rows[2].dayType).toBe('Weekend') // May 3 = Sunday
    expect(rows[3].dayType).toBe('WorkDay') // May 4 = Monday
  })

  it('uses explicit dayType from map over auto-classification', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      timeEntries: [],
      workPeriods: [],
      dayTypes: new Map([['2026-05-01', 'PublicHoliday']]),
      autoCategory: 'Coremedia',
      autoCategoryOverrides: new Map(),
    })

    expect(rows[0].dayType).toBe('PublicHoliday')
  })
})
