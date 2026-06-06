// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateMonthStats, calculateOvertimeToDate } from './monthStats'

describe('calculateMonthStats', () => {
  it('calculates totals for a normal month', () => {
    // 20 days with 8h each = 160h worked, target = 20*8 = 160h
    const worked = Array.from<number>({ length: 20 }).fill(8)
    const result = calculateMonthStats(worked, 20, 8)
    expect(result.totalHours).toBe(160)
    expect(result.targetHours).toBe(160)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('returns 100% fulfillment when there are no tracked days', () => {
    const result = calculateMonthStats([], 0, 8)
    expect(result.targetHours).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('shows positive overtime when worked exceeds target', () => {
    const worked = [9, 9, 9, 9, 9] // 45h worked, 5 tracked days * 8 = 40h target
    const result = calculateMonthStats(worked, 5, 8)
    expect(result.overtime).toBe(5)
    expect(result.fulfillmentPercent).toBeCloseTo(112.5)
  })

  it('shows negative overtime when worked is below target', () => {
    const worked = [7, 7, 7, 7, 7] // 35h worked, 5 tracked days * 8 = 40h target
    const result = calculateMonthStats(worked, 5, 8)
    expect(result.overtime).toBe(-5)
    expect(result.fulfillmentPercent).toBe(87.5)
  })

  it('ignores days with zero tracked hours in target calculation', () => {
    // 3 tracked days (8h each) + 2 untracked (0h) = 24h worked
    // Target = 3 * 8 = 24h (not 5 * 8 = 40h)
    const worked = [8, 0, 8, 0, 8]
    const result = calculateMonthStats(worked, 5, 8)
    expect(result.totalHours).toBe(24)
    expect(result.targetHours).toBe(24)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('returns overtime=0 and 100% when exactly on target', () => {
    const worked = [8, 8]
    const result = calculateMonthStats(worked, 2, 8)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })
})

describe('calculateOvertimeToDate', () => {
  it('returns all zeros for empty input', () => {
    const result = calculateOvertimeToDate([], [], '2026-05-19', 8)
    expect(result.value).toBe(0)
    expect(result.workedToday).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('counts only today when it is the only date', () => {
    const result = calculateOvertimeToDate([6], ['2026-05-19'], '2026-05-19', 8)
    // 1 tracked day (today), target = 1*8 = 8, value = 6 - 8 = -2
    expect(result.value).toBe(-2)
    expect(result.workedToday).toBe(6)
    expect(result.priorOvertime).toBe(0)
  })

  it('stops processing dates after today', () => {
    const result = calculateOvertimeToDate([8, 8, 8], ['2026-05-17', '2026-05-18', '2026-05-20'], '2026-05-19', 8)
    // Only 2026-05-17 and 2026-05-18 are before/on today (2026-05-20 skipped)
    // workedToday = 0 (no entry for 2026-05-19), prior = 16h, priorTracked = 2, target = 2*8
    expect(result.value).toBe(0)
    expect(result.workedToday).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('computes positive value when prior days have overtime', () => {
    const result = calculateOvertimeToDate([10, 10], ['2026-05-17', '2026-05-18'], '2026-05-19', 8)
    // 2 prior days, 10h each, target = 2*8=16, value = 20-16 = 4
    expect(result.value).toBe(4)
    expect(result.priorOvertime).toBe(4)
    expect(result.workedToday).toBe(0)
  })

  it('computes negative value when prior days have undertime', () => {
    const result = calculateOvertimeToDate([6, 6], ['2026-05-17', '2026-05-18'], '2026-05-19', 8)
    expect(result.value).toBe(-4)
    expect(result.priorOvertime).toBe(-4)
  })

  it('separates today hours from prior hours', () => {
    const result = calculateOvertimeToDate([8, 8, 4], ['2026-05-17', '2026-05-18', '2026-05-19'], '2026-05-19', 8)
    // today = 4h, prior = 16h (2 days * 8 = target 16), priorOvertime = 0
    // total tracked = 3 days * 8 = 24, worked = 20, value = -4
    expect(result.workedToday).toBe(4)
    expect(result.priorOvertime).toBe(0)
    expect(result.value).toBe(-4)
  })

  it('skips prior days with 0 hours in target count', () => {
    const result = calculateOvertimeToDate([0, 8], ['2026-05-17', '2026-05-18'], '2026-05-19', 8)
    // 2026-05-17 has 0h — not tracked, not counted toward target
    // 2026-05-18 has 8h — 1 tracked day, target = 8, overtime = 0
    expect(result.value).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })

  it('today with 0 hours does not count as a tracked day', () => {
    const result = calculateOvertimeToDate([8, 0], ['2026-05-18', '2026-05-19'], '2026-05-19', 8)
    // prior: 1 day * 8h = 8h target, priorOvertime = 0
    // today: 0h, not tracked
    // value = 8 - 1*8 = 0
    expect(result.value).toBe(0)
    expect(result.workedToday).toBe(0)
    expect(result.priorOvertime).toBe(0)
  })
})
