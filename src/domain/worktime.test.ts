import { describe, it, expect } from 'vitest'
import { calculateWorkedHours, calculateRestarbeitszeit } from './worktime'
import type { WorkWindow } from '../repositories/types'

const makeWindow = (start: string, end: string): WorkWindow => ({
  id: '1', date: '2024-01-15', start, end,
})

describe('calculateWorkedHours', () => {
  it('returns 0 when there are no WorkWindows', () => {
    expect(calculateWorkedHours([])).toBe(0)
  })

  it('returns the duration in decimal hours for a single WorkWindow', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '17:00')])).toBe(8)
  })

  it('sums durations across multiple WorkWindows', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', '17:00')]
    expect(calculateWorkedHours(windows)).toBe(7)
  })

  it('handles fractional hours (30-minute window → 0.5h)', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '09:30')])).toBe(0.5)
  })

  it('handles a WorkWindow that spans midnight', () => {
    expect(calculateWorkedHours([makeWindow('23:00', '01:00')])).toBe(2)
  })
})

describe('calculateRestarbeitszeit', () => {
  it('returns a positive value and isOvertime=false when hours are missing', () => {
    // Given: 8h target, only 6h worked
    const result = calculateRestarbeitszeit(8, 6)
    expect(result.value).toBe(2)
    expect(result.isOvertime).toBe(false)
  })

  it('returns a negative value and isOvertime=true when overtime is worked', () => {
    // Given: 8h target, 9.5h worked
    const result = calculateRestarbeitszeit(8, 9.5)
    expect(result.value).toBe(-1.5)
    expect(result.isOvertime).toBe(true)
  })

  it('returns value=0 and isOvertime=false when WorkedHours exactly meets Sollstunden', () => {
    const result = calculateRestarbeitszeit(8, 8)
    expect(result.value).toBe(0)
    expect(result.isOvertime).toBe(false)
  })
})
