// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildMonthSummaries } from './daySummary'
import type { MonthData, WorkPeriod } from '../../infra/repositories/types'

function win(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

function openWin(id: string, start: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end: null, category, subtasks: [] }
}

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
        windows: [win('1', '09:00', '12:00'), win('2', '13:00', '17:00')],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.workedHours).toBe(7)
  })

  it('computes entryTotal from period categories (excluding uncategorized)', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [{ ...win('w1', '09:00', '12:00', 'QA'), subtasks: [{ id: 's1', category: 'Support', hours: 2 }] }],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    // QA gets 1h (3h total - 2h sliced), Support gets 2h → total 3h
    expect(result.days[0]!.entryTotal).toBe(3)
  })

  it('marks balanced when all period hours are categorized (no uncategorized remainder)', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [win('w1', '09:00', '17:00', '_COREMEDIA')],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.isEntriesBalanced).toBe(true)
    expect(result.days[0]!.dayStatus).toBe('complete')
  })

  it('marks needs-review when period has uncategorized hours', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [win('w1', '09:00', '17:00', '_UNCATEGORIZED')],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.isEntriesBalanced).toBe(false)
    expect(result.days[0]!.dayStatus).toBe('needs-review')
  })

  it('respects dayTypeOverrides for non-working days', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [], dayTypeOverride: 'Vacation' },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.dayType).toBe('Vacation')
    expect(result.days[0]!.dayStatus).toBe('leave')
  })

  it('counts only WorkDays in workDayCount', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [], dayTypeOverride: 'Vacation' },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.workDayCount).toBe(20)
  })

  it('returns hasAnyTrackedHours correctly', () => {
    const empty = buildMonthSummaries(2026, 5, { monthData: {}, today })
    expect(empty.hasAnyTrackedHours).toBe(false)

    const withHours = buildMonthSummaries(2026, 5, {
      monthData: { '2026-05-01': { windows: [win('w1', '09:00', '10:00')] } },
      today,
    })
    expect(withHours.hasAnyTrackedHours).toBe(true)
  })

  it('marks today with today status', () => {
    const monthData: MonthData = {
      '2026-05-19': { windows: [win('w1', '09:00', '17:00')] },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[18]!.dayStatus).toBe('today')
  })

  it('surfaces isConfirmed from raw day data and sets confirmed status', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [win('w1', '09:00', '12:00', '_UNCATEGORIZED')], confirmed: true },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.isConfirmed).toBe(true)
    expect(result.days[0]!.dayStatus).toBe('confirmed')
    expect(result.days[0]!.displayStatus).toBe('confirmed')
  })

  it('sets isEntriesBalanced false when workedHours is zero', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [] },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.isEntriesBalanced).toBe(false)
  })

  it('excludes uncategorized hours from entryTotal', () => {
    const monthData: MonthData = {
      '2026-05-01': {
        windows: [win('w1', '09:00', '10:00', '_UNCATEGORIZED')],
      },
    }
    const result = buildMonthSummaries(2026, 5, { monthData, today })
    expect(result.days[0]!.entryTotal).toBe(0)
  })

  it('workedHoursPerDay has exactly one entry per day in the month', () => {
    const result = buildMonthSummaries(2026, 5, { monthData: {}, today })
    expect(result.workedHoursPerDay).toHaveLength(31)
    expect(result.workedHoursPerDay[0]).toBe(0)
  })

  describe('projectedWorkedHoursToday', () => {
    it('projects a planned-stop period to its full duration', () => {
      // today ends at 18:00 (9h) but now is only 14:00 (5h elapsed)
      const monthData: MonthData = {
        [today]: { windows: [win('a', '09:00', '18:00')] },
      }
      const result = buildMonthSummaries(2026, 5, { monthData, today, todayNow: '14:00' })
      const todayIdx = result.days.findIndex((d) => d.date === today)
      expect(result.days[todayIdx]!.workedHours).toBeCloseTo(5)
      expect(result.projectedWorkedHoursToday).toBeCloseTo(9)
    })

    it('falls back to elapsed workedHours when today has no todayNow', () => {
      const monthData: MonthData = { [today]: { windows: [win('a', '09:00', '17:00')] } }
      const result = buildMonthSummaries(2026, 5, { monthData, today })
      expect(result.projectedWorkedHoursToday).toBe(8)
    })
  })

  describe('overnight/next-day scenarios', () => {
    it('past day with only an open period counts worked hours (capped at 23:59)', () => {
      const monthData: MonthData = {
        '2026-05-18': { windows: [openWin('a', '09:00')] },
      }
      // today is the day AFTER the open period — app ran overnight
      const result = buildMonthSummaries(2026, 5, { monthData, today: '2026-05-19' })
      // 09:00 → 23:59 = 14h59m
      expect(result.workedHoursPerDay[17]).toBeGreaterThan(14)
    })

    it('past day with a closed period is unaffected by the capping logic', () => {
      const monthData: MonthData = {
        '2026-05-18': { windows: [win('a', '09:00', '17:00')] },
      }
      const result = buildMonthSummaries(2026, 5, { monthData, today: '2026-05-19' })
      expect(result.workedHoursPerDay[17]).toBe(8)
    })

    it('past day with both a closed period and an open period counts both', () => {
      const monthData: MonthData = {
        '2026-05-18': {
          windows: [win('a', '09:00', '12:00'), openWin('b', '13:00')],
        },
      }
      const result = buildMonthSummaries(2026, 5, { monthData, today: '2026-05-19' })
      // 09:00→12:00 = 3h, 13:00→23:59 = 10h59m, total > 13h
      expect(result.workedHoursPerDay[17]).toBeGreaterThan(13)
    })
  })
})
