import { describe, it, expect } from 'vitest'
import { calculateMonthStats } from './monthStats'

describe('calculateMonthStats', () => {
  it('calculates totals for a normal month', () => {
    // 20 work days, 8h target, worked [8,8,8,...] = 160h
    const worked = Array(20).fill(8) as number[]
    const result = calculateMonthStats(worked, 20, 8)
    expect(result.totalHours).toBe(160)
    expect(result.targetHours).toBe(160)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('returns 100% fulfillment when there are no work days', () => {
    const result = calculateMonthStats([], 0, 8)
    expect(result.targetHours).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('shows positive overtime when worked exceeds target', () => {
    const worked = [9, 9, 9, 9, 9] // 45h worked, 40h target
    const result = calculateMonthStats(worked, 5, 8)
    expect(result.overtime).toBe(5)
    expect(result.fulfillmentPercent).toBeCloseTo(112.5)
  })

  it('shows negative overtime when worked is below target', () => {
    const worked = [7, 7, 7, 7, 7] // 35h worked, 40h target
    const result = calculateMonthStats(worked, 5, 8)
    expect(result.overtime).toBe(-5)
    expect(result.fulfillmentPercent).toBe(87.5)
  })

  it('returns overtime=0 and 100% when exactly on target', () => {
    const worked = [8, 8]
    const result = calculateMonthStats(worked, 2, 8)
    expect(result.overtime).toBe(0)
    expect(result.fulfillmentPercent).toBe(100)
  })

  it('returns all zeros for an empty array', () => {
    const result = calculateMonthStats([], 0, 8)
    expect(result.totalHours).toBe(0)
    expect(result.overtime).toBe(0)
  })
})
