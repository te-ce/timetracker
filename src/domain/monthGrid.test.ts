import { describe, it, expect } from 'vitest'
import { buildMonthGrid } from './monthGrid'
import type { MonthData } from '../repositories/types'

describe('buildMonthGrid', () => {
  it('produces one row per day in the month', () => {
    const rows = buildMonthGrid({ year: 2026, month: 5, monthData: {}, dayTypes: new Map() })

    expect(rows).toHaveLength(31)
    expect(rows[0]!.date).toBe('2026-05-01')
    expect(rows[30]!.date).toBe('2026-05-31')
  })

  it('calculates workedHours from WorkPeriods per day', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [],
        windows: [
          { id: '1', start: '09:00', end: '12:00' },
          { id: '2', start: '13:00', end: '17:00' },
        ],
      },
      '2026-05-02': {
        entries: [],
        windows: [{ id: '3', start: '08:00', end: '16:30' }],
      },
    }
    const rows = buildMonthGrid({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.workedHours).toBe(7)
    expect(rows[1]!.workedHours).toBe(8.5)
    expect(rows[2]!.workedHours).toBe(0)
  })

  it('groups time entries by category per day', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [
          { id: '1', category: 'QA', hours: 2 },
          { id: '2', category: 'Support', hours: 1.5 },
          { id: '3', category: 'QA', hours: 1 },
        ],
        windows: [],
      },
      '2026-05-02': {
        entries: [{ id: '4', category: 'Infra', hours: 4 }],
        windows: [],
      },
    }
    const rows = buildMonthGrid({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.entries).toEqual({ QA: 3, Support: 1.5 })
    expect(rows[1]!.entries).toEqual({ Infra: 4 })
  })

  it('computes autoCategoryHours as workedHours minus manual entries', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        entries: [
          { id: '1', category: 'QA', hours: 2 },
          { id: '2', category: 'Support', hours: 1 },
        ],
        windows: [{ id: 'w1', start: '09:00', end: '17:00' }],
      },
    }
    const rows = buildMonthGrid({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.workedHours).toBe(8)
    expect(rows[0]!.autoCategoryHours).toBe(5)
  })

  it('classifies weekends automatically', () => {
    const rows = buildMonthGrid({ year: 2026, month: 5, monthData: {}, dayTypes: new Map() })

    expect(rows[0]!.dayType).toBe('WorkDay')  // May 1 = Friday
    expect(rows[1]!.dayType).toBe('Weekend')  // May 2 = Saturday
    expect(rows[2]!.dayType).toBe('Weekend')  // May 3 = Sunday
    expect(rows[3]!.dayType).toBe('WorkDay')  // May 4 = Monday
  })

  it('uses explicit dayType from map over auto-classification', () => {
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      monthData: {},
      dayTypes: new Map([['2026-05-01', 'PublicHoliday']]),
    })

    expect(rows[0]!.dayType).toBe('PublicHoliday')
  })

  it('uses dayTypeOverride from monthData over dayTypes map', () => {
    const monthData: MonthData = {
      '2026-05-01': { entries: [], windows: [], dayTypeOverride: 'Vacation' },
    }
    const rows = buildMonthGrid({
      year: 2026,
      month: 5,
      monthData,
      dayTypes: new Map([['2026-05-01', 'PublicHoliday']]),
    })

    expect(rows[0]!.dayType).toBe('Vacation')
  })
})
