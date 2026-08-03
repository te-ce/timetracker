// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { composeMonthOvertime } from './monthOvertime'
import type { MonthData, WorkPeriod } from '../infra/repositories/types'
import type { WeekdayHours } from './weekdayHours'
import { DEFAULT_APP_CONFIG, resolveAppConfig } from './appConfigDefaults'

function win(id: string, start: string, end: string): WorkPeriod {
  return { id, start, end, category: '_COREMEDIA', subtasks: [] }
}

describe('composeMonthOvertime', () => {
  // May 2026: May 1=Fri, May 2=Sat, May 3=Sun, May 4=Mon
  const STD: WeekdayHours = [0, 8, 8, 8, 8, 8, 0]

  it('produces one DaySummary per day in the month', () => {
    const result = composeMonthOvertime(2026, 5, {}, resolveAppConfig(undefined), '2026-05-19')
    expect(result.summaries.days).toHaveLength(31)
  })

  it('produces one target-hours entry per day, aligned with the summaries', () => {
    const result = composeMonthOvertime(
      2026,
      5,
      {},
      resolveAppConfig({ ...DEFAULT_APP_CONFIG, weekdayHours: STD }),
      '2026-05-19',
    )
    expect(result.targetHoursPerDay).toHaveLength(31)
    expect(result.targetHoursPerDay[0]).toBe(8) // May 1 = Friday
    expect(result.targetHoursPerDay[1]).toBe(0) // May 2 = Saturday
  })

  it('computes cumulative overtime-to-date from the month summaries', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [win('1', '08:00', '18:00')] }, // 10h, +2h over an 8h target
    }
    const result = composeMonthOvertime(
      2026,
      5,
      monthData,
      resolveAppConfig({ ...DEFAULT_APP_CONFIG, weekdayHours: STD }),
      '2026-05-01',
    )
    expect(result.overtimeToDate.value).toBeCloseTo(2)
    expect(result.overtimeToDate.workedToday).toBe(10)
  })

  it('projects a planned-stop period on today into overtimeToDate', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [win('1', '08:00', '18:00')] }, // ends at 18:00, now is 14:00
    }
    const result = composeMonthOvertime(
      2026,
      5,
      monthData,
      resolveAppConfig({ ...DEFAULT_APP_CONFIG, weekdayHours: STD }),
      '2026-05-01',
      '14:00',
    )
    // workedToday reflects live elapsed (6h), but the cumulative value uses the
    // full planned duration (10h) since a planned-stop period is present.
    expect(result.overtimeToDate.workedToday).toBeCloseTo(6)
    expect(result.overtimeToDate.value).toBeCloseTo(2)
  })
})
