import { describe, it, expect } from 'vitest'
import { buildMonthTable } from './buildMonthTable'
import type { MonthData, WorkPeriod } from '../../infra/repositories/types'

function win(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

describe('buildMonthTable', () => {
  it('produces one row per day in the month', () => {
    const rows = buildMonthTable({ year: 2026, month: 5, monthData: {}, dayTypes: new Map() })

    expect(rows).toHaveLength(31)
    expect(rows[0]!.date).toBe('2026-05-01')
    expect(rows[30]!.date).toBe('2026-05-31')
  })

  it('calculates workedHours from WorkPeriods per day', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [win('1', '09:00', '12:00'), win('2', '13:00', '17:00')],
      },
      '2026-05-02': {
        windows: [win('3', '08:00', '16:30')],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.workedHours).toBe(7)
    expect(rows[1]!.workedHours).toBe(8.5)
    expect(rows[2]!.workedHours).toBe(0)
  })

  it('groups period categories per day', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [
          { ...win('1', '09:00', '11:00', 'QA'), subtasks: [{ id: 's1', category: 'Support', hours: 1.5 }] },
          win('3', '13:00', '14:00', 'QA'),
        ],
      },
      '2026-05-02': {
        windows: [win('4', '09:00', '13:00', 'Infra')],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    // Period 1: 2h total, 1.5h sliced to Support → 0.5h QA, 1.5h Support
    // Period 3: 1h QA
    // Total: QA=1.5, Support=1.5
    expect(rows[0]!.entries['QA']).toBeCloseTo(1.5)
    expect(rows[0]!.entries['Support']).toBeCloseTo(1.5)
    expect(rows[1]!.entries['Infra']).toBe(4)
  })

  it('computes autoCategoryHours as uncategorized hours', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [
          { ...win('w1', '09:00', '17:00', '_UNCATEGORIZED'), subtasks: [{ id: 's1', category: 'QA', hours: 3 }] },
        ],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.workedHours).toBe(8)
    expect(rows[0]!.autoCategoryHours).toBe(5)
  })

  it('classifies weekends automatically', () => {
    const rows = buildMonthTable({ year: 2026, month: 5, monthData: {}, dayTypes: new Map() })

    expect(rows[0]!.dayType).toBe('WorkDay') // May 1 = Friday
    expect(rows[1]!.dayType).toBe('Weekend') // May 2 = Saturday
    expect(rows[2]!.dayType).toBe('Weekend') // May 3 = Sunday
    expect(rows[3]!.dayType).toBe('WorkDay') // May 4 = Monday
  })

  it('uses explicit dayType from map over auto-classification', () => {
    const rows = buildMonthTable({
      year: 2026,
      month: 5,
      monthData: {},
      dayTypes: new Map([['2026-05-01', 'PublicHoliday']]),
    })

    expect(rows[0]!.dayType).toBe('PublicHoliday')
  })

  it('uses dayTypeOverride from monthData over dayTypes map', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [], dayTypeOverride: 'Vacation' },
    }
    const rows = buildMonthTable({
      year: 2026,
      month: 5,
      monthData,
      dayTypes: new Map([['2026-05-01', 'PublicHoliday']]),
    })

    expect(rows[0]!.dayType).toBe('Vacation')
  })
})
