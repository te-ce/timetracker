// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateMonthStats, calculateOvertimeToDate } from './monthStats'

describe('calculateMonthStats', () => {
  it('calculates totals for a normal month', () => {
    // 20 days with 8h each = 160h worked, target = 20*8 = 160h
    const worked = Array.from<number>({ length: 20 }).fill(8)
    const targets = Array.from<number>({ length: 20 }).fill(8)
    const result = calculateMonthStats(worked, targets)
    expect(result.totalHours).toBe(160)
    expect(result.targetHours).toBe(160)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('returns 100% fulfillment when there are no tracked days', () => {
    const result = calculateMonthStats([], [])
    expect(result.targetHours).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('shows positive overtime when worked exceeds target', () => {
    const worked = [9, 9, 9, 9, 9] // 45h worked, target = 5*8 = 40h
    const targets = [8, 8, 8, 8, 8]
    const result = calculateMonthStats(worked, targets)
    expect(result.overtime).toBe(5)
    expect(result.fulfillmentPercent).toBeCloseTo(112.5)
  })

  it('shows negative overtime when worked is below target', () => {
    const worked = [7, 7, 7, 7, 7]
    const targets = [8, 8, 8, 8, 8]
    const result = calculateMonthStats(worked, targets)
    expect(result.overtime).toBe(-5)
    expect(result.fulfillmentPercent).toBe(87.5)
  })

  it('ignores days with zero tracked hours in target calculation', () => {
    // 3 tracked days (8h each) + 2 untracked (0h) = 24h worked
    // Target = sum of targets for tracked days only = 3*8 = 24h
    const worked = [8, 0, 8, 0, 8]
    const targets = [8, 8, 8, 8, 8]
    const result = calculateMonthStats(worked, targets)
    expect(result.totalHours).toBe(24)
    expect(result.targetHours).toBe(24)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('uses per-day target — different targets per day', () => {
    // Mon=8, Tue=7, Sat=2 — all three tracked
    const worked = [8, 7, 2]
    const targets = [8, 7, 2]
    const result = calculateMonthStats(worked, targets)
    expect(result.totalHours).toBe(17)
    expect(result.targetHours).toBe(17)
    expect(result.overtime).toBe(0)
  })

  it('returns overtime=0 and 100% when exactly on target', () => {
    const worked = [8, 8]
    const targets = [8, 8]
    const result = calculateMonthStats(worked, targets)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })
})

describe('calculateOvertimeToDate', () => {
  it('returns all zeros for empty input', () => {
    const result = calculateOvertimeToDate([], [], '2026-05-19', [])
    expect(result.value).toBe(0)
    expect(result.workedToday).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('counts only today when it is the only date', () => {
    const result = calculateOvertimeToDate([6], ['2026-05-19'], '2026-05-19', [8])
    // 1 tracked day (today), target = 8, value = 6 - 8 = -2
    expect(result.value).toBe(-2)
    expect(result.workedToday).toBe(6)
    expect(result.priorOvertime).toBe(0)
  })

  it('stops processing dates after today', () => {
    const result = calculateOvertimeToDate(
      [8, 8, 8],
      ['2026-05-17', '2026-05-18', '2026-05-20'],
      '2026-05-19',
      [8, 8, 8],
    )
    expect(result.value).toBe(0)
    expect(result.workedToday).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('computes positive value when prior days have overtime', () => {
    const result = calculateOvertimeToDate([10, 10], ['2026-05-17', '2026-05-18'], '2026-05-19', [8, 8])
    expect(result.value).toBe(4)
    expect(result.priorOvertime).toBe(4)
    expect(result.workedToday).toBe(0)
  })

  it('computes negative value when prior days have undertime', () => {
    const result = calculateOvertimeToDate([6, 6], ['2026-05-17', '2026-05-18'], '2026-05-19', [8, 8])
    expect(result.value).toBe(-4)
    expect(result.priorOvertime).toBe(-4)
  })

  it('separates today hours from prior hours', () => {
    const result = calculateOvertimeToDate(
      [8, 8, 4],
      ['2026-05-17', '2026-05-18', '2026-05-19'],
      '2026-05-19',
      [8, 8, 8],
    )
    expect(result.workedToday).toBe(4)
    expect(result.priorOvertime).toBe(0)
    expect(result.value).toBe(-4)
  })

  it('skips prior days with 0 hours in target count', () => {
    const result = calculateOvertimeToDate([0, 8], ['2026-05-17', '2026-05-18'], '2026-05-19', [8, 8])
    expect(result.value).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('today with 0 hours does not count as a tracked day', () => {
    const result = calculateOvertimeToDate([8, 0], ['2026-05-18', '2026-05-19'], '2026-05-19', [8, 8])
    expect(result.value).toBe(0)
    expect(result.workedToday).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('uses per-day target hours — Saturday with 2h target', () => {
    // 2026-05-17 = Saturday, 2026-05-18 = Sunday, 2026-05-19 = Monday
    const result = calculateOvertimeToDate(
      [2, 0, 8],
      ['2026-05-17', '2026-05-18', '2026-05-19'],
      '2026-05-19',
      [2, 0, 8],
    )
    // Sat: worked=2, target=2, no overtime
    // Sun: worked=0, target=0, not tracked
    // Mon: worked=8 (today), target=8
    expect(result.value).toBe(0)
    expect(result.priorOvertime).toBe(0)
    expect(result.workedToday).toBe(8)
  })

  it('uses projectedWorkedToday for the cumulative value but keeps workedToday as elapsed', () => {
    // today so far: 4h elapsed, but a planned-stop period projects to 8h by end of day
    const result = calculateOvertimeToDate([4], ['2026-05-19'], '2026-05-19', [8], 8)
    expect(result.workedToday).toBe(4)
    expect(result.value).toBe(0)
  })

  it('includes prior days plus projected today in the cumulative value', () => {
    const result = calculateOvertimeToDate([10, 4], ['2026-05-18', '2026-05-19'], '2026-05-19', [8, 8], 9)
    // prior: 10-8=+2, today projected: 9-8=+1, total value = +3
    expect(result.priorOvertime).toBe(2)
    expect(result.workedToday).toBe(4)
    expect(result.value).toBe(3)
  })

  it('falls back to today hours when projectedWorkedToday is not given', () => {
    const result = calculateOvertimeToDate([4], ['2026-05-19'], '2026-05-19', [8])
    expect(result.value).toBe(-4)
  })
})
