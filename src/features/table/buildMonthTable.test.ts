// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildMonthTable } from './buildMonthTable'
import type { MonthData, WorkPeriod } from '../../infra/repositories/types'
import type { WeekdayHours } from '../../shared/weekdayHours'

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

  it('excludes the _UNCATEGORIZED key from entries', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [
          {
            ...win('w1', '09:00', '10:00', '_UNCATEGORIZED'),
            subtasks: [{ id: 's1', category: 'QA', hours: 0.5 }],
          },
        ],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect('_UNCATEGORIZED' in rows[0]!.entries).toBe(false)
    expect(rows[0]!.entries['QA']).toBeCloseTo(0.5)
  })

  it('sets hasUnaccountedHours true when uncategorized hours exceed threshold', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [win('w1', '09:00', '10:00', '_UNCATEGORIZED')],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.hasUnaccountedHours).toBe(true)
    expect(rows[0]!.autoCategoryHours).toBe(1)
  })

  it('sets hasUnaccountedHours false when all hours are categorized', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [win('w1', '09:00', '10:00', '_COREMEDIA')],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.hasUnaccountedHours).toBe(false)
  })

  describe('accumulatedOvertime', () => {
    // May 2026: May 1=Thu, May 2=Sat, May 3=Sun, May 4=Mon, May 5=Tue
    // DEFAULT_WEEKDAY_HOURS: Mon-Fri=8h, Sat-Sun=0h
    const STD: WeekdayHours = [0, 8, 8, 8, 8, 8, 0]

    it('accumulates overtime across workdays up to today', () => {
      // May 1 (Thu): 10h worked → +2h; May 4 (Mon): 6h worked → +2-2=0h
      const monthData: MonthData = {
        '2026-05-01': { windows: [win('1', '08:00', '18:00')] }, // 10h
        '2026-05-04': { windows: [win('2', '09:00', '15:00')] }, // 6h
      }
      const rows = buildMonthTable({
        year: 2026,
        month: 5,
        monthData,
        dayTypes: new Map(),
        weekdayHours: STD,
        today: '2026-05-04',
      })
      expect(rows[0]!.accumulatedOvertime).toBeCloseTo(2) // May 1: +2h
      expect(rows[1]!.accumulatedOvertime).toBeCloseTo(2) // May 2 (Sat, 0h): no change
      expect(rows[2]!.accumulatedOvertime).toBeCloseTo(2) // May 3 (Sun, 0h): no change
      expect(rows[3]!.accumulatedOvertime).toBeCloseTo(0) // May 4: +2-2=0
    })

    it('projects a planned-stop period on today to its full duration in accumulatedOvertime', () => {
      // May 1 (Thu, today): period ends at 18:00 (10h), but now is only 14:00 (6h elapsed)
      const monthData: MonthData = {
        '2026-05-01': { windows: [win('1', '08:00', '18:00')] },
      }
      const rows = buildMonthTable({
        year: 2026,
        month: 5,
        monthData,
        dayTypes: new Map(),
        weekdayHours: STD,
        today: '2026-05-01',
        todayNow: '14:00',
      })
      // workedHours column stays elapsed-only (6h), but accumulatedOvertime uses
      // the full planned 10h → +2h, not the elapsed-only -2h.
      expect(rows[0]!.workedHours).toBeCloseTo(6)
      expect(rows[0]!.accumulatedOvertime).toBeCloseTo(2)
    })

    it('future dates (after today) have null accumulatedOvertime', () => {
      const monthData: MonthData = {
        '2026-05-01': { windows: [win('1', '08:00', '16:00')] }, // 8h
      }
      const rows = buildMonthTable({
        year: 2026,
        month: 5,
        monthData,
        dayTypes: new Map(),
        weekdayHours: STD,
        today: '2026-05-01',
      })
      expect(rows[0]!.accumulatedOvertime).toBeCloseTo(0) // May 1 = today, 8h-8h=0
      expect(rows[1]!.accumulatedOvertime).toBeNull() // May 2 = future
      expect(rows[4]!.accumulatedOvertime).toBeNull() // May 5 = future
    })

    it('untracked past days (0h) carry forward prior accumulated without adding target', () => {
      // May 1 (Thu): 0h → target not counted, accumulated=0
      // May 4 (Mon): 10h → accumulated=+2h
      // May 5 (Tue): 0h → accumulated stays +2h
      const monthData: MonthData = {
        '2026-05-04': { windows: [win('1', '08:00', '18:00')] }, // 10h
      }
      const rows = buildMonthTable({
        year: 2026,
        month: 5,
        monthData,
        dayTypes: new Map(),
        weekdayHours: STD,
        today: '2026-05-05',
      })
      expect(rows[0]!.accumulatedOvertime).toBeCloseTo(0) // May 1: 0h, no change
      expect(rows[3]!.accumulatedOvertime).toBeCloseTo(2) // May 4: +2h
      expect(rows[4]!.accumulatedOvertime).toBeCloseTo(2) // May 5: 0h, carries +2h
    })

    it('hours worked on a non-WorkDay count as pure overtime (target=0)', () => {
      // May 2 (Sat, Weekend): 4h worked, target=0 → +4h
      const monthData: MonthData = {
        '2026-05-02': { windows: [win('1', '10:00', '14:00')] }, // 4h on Saturday
      }
      const rows = buildMonthTable({
        year: 2026,
        month: 5,
        monthData,
        dayTypes: new Map(),
        weekdayHours: STD,
        today: '2026-05-02',
      })
      expect(rows[0]!.accumulatedOvertime).toBeCloseTo(0) // May 1: 0h
      expect(rows[1]!.accumulatedOvertime).toBeCloseTo(4) // May 2 (Sat): +4h overtime
    })

    it('defaults weekdayHours and today so existing callers get accumulatedOvertime without crash', () => {
      const rows = buildMonthTable({ year: 2026, month: 5, monthData: {}, dayTypes: new Map() })
      // All rows should have a numeric accumulatedOvertime (today defaults to far future → no nulls)
      expect(rows[0]!.accumulatedOvertime).toBe(0)
      expect(rows[30]!.accumulatedOvertime).toBe(0)
    })
  })

  it('sets hasUnaccountedHours false when uncategorized hours are at or below 0.001', () => {
    // 1h window, 0.9995h sliced → ~0.0005h uncategorized (below threshold)
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [
          {
            ...win('w1', '09:00', '10:00', '_UNCATEGORIZED'),
            subtasks: [{ id: 's1', category: 'QA', hours: 0.9995 }],
          },
        ],
      },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map() })

    expect(rows[0]!.hasUnaccountedHours).toBe(false)
  })
})
