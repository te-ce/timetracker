// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { composeMonthOvertime, loadOvertimeCarryOverBeforeMonth } from './monthOvertime'
import { InMemoryMonthRepository } from '../infra/repositories/in-memory/month-repository'
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

  it('composeMonthOvertime seeds the running total from priorMonthsOvertime', () => {
    const result = composeMonthOvertime(2026, 5, {}, resolveAppConfig(undefined), '2026-05-01', undefined, 3)
    expect(result.overtimeToDate.value).toBeCloseTo(3)
    expect(result.overtimeToDate.priorOvertime).toBeCloseTo(3)
  })
})

describe('loadOvertimeCarryOverBeforeMonth', () => {
  const STD: WeekdayHours = [0, 8, 8, 8, 8, 8, 0]

  it('returns 0 when no prior months are tracked', async () => {
    const monthRepo = new InMemoryMonthRepository({})
    const result = await loadOvertimeCarryOverBeforeMonth(monthRepo, 2026, 5, STD)
    expect(result).toBe(0)
  })

  it('sums overtime from a single prior month', async () => {
    const monthRepo = new InMemoryMonthRepository({
      '2026-04': { '2026-04-01': { windows: [win('1', '08:00', '18:00')] } }, // 10h vs. 8h target = +2h
    })
    const result = await loadOvertimeCarryOverBeforeMonth(monthRepo, 2026, 5, STD)
    expect(result).toBeCloseTo(2)
  })

  it('accumulates across multiple prior months', async () => {
    const monthRepo = new InMemoryMonthRepository({
      '2026-03': { '2026-03-02': { windows: [win('1', '08:00', '18:00')] } }, // Mon, +2h
      '2026-04': { '2026-04-01': { windows: [win('1', '08:00', '14:00')] } }, // Wed, -2h
    })
    const result = await loadOvertimeCarryOverBeforeMonth(monthRepo, 2026, 5, STD)
    expect(result).toBeCloseTo(0)
  })

  it('ignores months at or after the target month', async () => {
    const monthRepo = new InMemoryMonthRepository({
      '2026-04': { '2026-04-01': { windows: [win('1', '08:00', '18:00')] } }, // +2h, counted
      '2026-05': { '2026-05-01': { windows: [win('1', '08:00', '20:00')] } }, // +4h, NOT counted (target month)
    })
    const result = await loadOvertimeCarryOverBeforeMonth(monthRepo, 2026, 5, STD)
    expect(result).toBeCloseTo(2)
  })
})
