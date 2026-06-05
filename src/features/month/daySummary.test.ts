import { describe, it, expect } from 'vitest'
import { buildMonthSummaries } from './daySummary'
import type { MonthData, WorkPeriod } from '../../infra/repositories/types'

function win(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
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
})
