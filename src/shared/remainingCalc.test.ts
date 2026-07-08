// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateRemaining, buildReceipt, buildBadgeLabel } from './remainingCalc'

describe('calculateRemaining', () => {
  it('subtracts carry-over and worked hours in until-zero-overtime mode', () => {
    const result = calculateRemaining({
      sollstunden: 8,
      priorOvertime: 1,
      workedHours: 5,
      remainingTimeMode: 'until-zero-overtime',
      isPlannedStopMode: false,
      countdownHours: 0,
    })
    expect(result).toEqual({ remaining: 2, requiredToday: 7 })
  })

  it('ignores carry-over in until-daily-target mode', () => {
    const result = calculateRemaining({
      sollstunden: 8,
      priorOvertime: 1,
      workedHours: 5,
      remainingTimeMode: 'until-daily-target',
      isPlannedStopMode: false,
      countdownHours: 0,
    })
    expect(result).toEqual({ remaining: 3, requiredToday: 8 })
  })

  it('uses the planned-stop countdown regardless of remainingTimeMode when in planned-stop mode', () => {
    const result = calculateRemaining({
      sollstunden: 8,
      priorOvertime: 1,
      workedHours: 5,
      remainingTimeMode: 'until-daily-target',
      isPlannedStopMode: true,
      countdownHours: 1.5,
    })
    expect(result).toEqual({ remaining: 1.5, requiredToday: 8 })
  })

  it('uses projectedWorkedHours instead of workedHours when provided', () => {
    // A planned stop projects 6h total even though only 2h have actually elapsed.
    const result = calculateRemaining({
      sollstunden: 8,
      priorOvertime: 0,
      workedHours: 2,
      projectedWorkedHours: 6,
      remainingTimeMode: 'until-zero-overtime',
      isPlannedStopMode: false,
      countdownHours: 0,
    })
    expect(result.remaining).toBe(2)
  })

  it('ignores projectedWorkedHours while isPlannedStopMode is true', () => {
    const result = calculateRemaining({
      sollstunden: 8,
      priorOvertime: 0,
      workedHours: 2,
      projectedWorkedHours: 6,
      remainingTimeMode: 'until-zero-overtime',
      isPlannedStopMode: true,
      countdownHours: 1.5,
    })
    expect(result.remaining).toBe(1.5)
  })

  it('goes negative (overtime) when worked hours exceed what is required', () => {
    const result = calculateRemaining({
      sollstunden: 8,
      priorOvertime: 0,
      workedHours: 9,
      remainingTimeMode: 'until-zero-overtime',
      isPlannedStopMode: false,
      countdownHours: 0,
    })
    expect(result.remaining).toBeCloseTo(-1)
  })
})

describe('buildBadgeLabel', () => {
  it('shows "left" when remaining is positive', () => {
    expect(buildBadgeLabel(2, 5, 'decimal', false)).toBe('2.00h left')
  })

  it('shows "Done" when remaining is exactly zero', () => {
    expect(buildBadgeLabel(0, 8, 'decimal', false)).toBe('Done')
  })

  it('shows overtime when remaining is negative', () => {
    expect(buildBadgeLabel(-1, 9, 'decimal', false)).toBe('1.00h overtime')
  })

  it('shows total worked when showTotalWorked is set, regardless of remaining', () => {
    expect(buildBadgeLabel(2, 5, 'decimal', true)).toBe('5.00h worked')
  })
})

describe('buildReceipt', () => {
  it('labels the total line "Remaining" when time is left', () => {
    const lines = buildReceipt(8, 0, 5, 0, 3, 'decimal')
    expect(lines.at(-1)).toEqual({ label: 'Remaining', value: '3.00h', isTotal: true })
  })

  it('labels the total line "Overtime" when remaining is negative', () => {
    const lines = buildReceipt(8, 0, 9, 0, -1, 'decimal')
    expect(lines.at(-1)).toEqual({ label: 'Overtime', value: '1.00h', isTotal: true })
  })

  it('computes "Required" from sollstunden alone in until-daily-target mode', () => {
    const lines = buildReceipt(8, 1, 5, 0, 3, 'decimal', 'until-daily-target')
    expect(lines[0]).toEqual({ label: 'Required', value: '8.00h' })
  })

  it('computes "Required" as target minus carry-over in until-zero-overtime mode', () => {
    const lines = buildReceipt(8, 1, 5, 0, 2, 'decimal', 'until-zero-overtime')
    expect(lines[0]).toEqual({ label: 'Required', value: '7.00h' })
  })
})
