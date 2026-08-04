import { describe, it, expect } from 'vitest'
import { officeStats } from './officeStats'
import type { DaySummary } from '../features/month/daySummary'
import type { WorkLocation } from '../infra/repositories/types'

function summary(date: string, dayType: DaySummary['dayType'], workedHours: number): DaySummary {
  return {
    date,
    dayType,
    workedHours,
    entryTotal: workedHours,

    dayStatus: 'complete',
    displayStatus: 'complete',
    statusReason: '',
    categoryBreakdown: {},
  }
}

describe('officeStats', () => {
  it('counts only tracked WorkDays with worked hours', () => {
    const days = [
      summary('2026-05-01', 'WorkDay', 8),
      summary('2026-05-02', 'Weekend', 0),
      summary('2026-05-03', 'WorkDay', 0),
    ]
    const locations = new Map<string, WorkLocation>([['2026-05-01', 'Office']])

    const result = officeStats(days, (date) => locations.get(date))

    expect(result.totalWorkDays).toBe(1)
    expect(result.officeDays).toBe(1)
    expect(result.officePercent).toBe(100)
  })

  it('returns 0 percent when there are no tracked WorkDays', () => {
    const result = officeStats([summary('2026-05-01', 'Weekend', 0)], () => undefined)

    expect(result.totalWorkDays).toBe(0)
    expect(result.officeDays).toBe(0)
    expect(result.officePercent).toBe(0)
  })

  it('rounds the office percentage', () => {
    const days = [
      summary('2026-05-01', 'WorkDay', 8),
      summary('2026-05-02', 'WorkDay', 8),
      summary('2026-05-03', 'WorkDay', 8),
    ]
    const locations = new Map<string, WorkLocation>([['2026-05-01', 'Office']])

    const result = officeStats(days, (date) => locations.get(date))

    expect(result.officePercent).toBe(33)
  })
})
