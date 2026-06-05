import { describe, it, expect } from 'vitest'
import { calculateWorkedHours, calculateRestarbeitszeit, calcSubtaskHours } from './worktime'
import type { WorkPeriod } from '../repositories/types'

const makeWindow = (start: string, end: string | null): WorkPeriod => ({
  id: '1',
  start,
  end,
  category: '',
  subtasks: [],
})

describe('calculateWorkedHours', () => {
  it('returns 0 when there are no WorkPeriods', () => {
    expect(calculateWorkedHours([])).toBe(0)
  })

  it('returns the duration in decimal hours for a single WorkPeriod', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '17:00')])).toBe(8)
  })

  it('sums durations across multiple WorkPeriods', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', '17:00')]
    expect(calculateWorkedHours(windows)).toBe(7)
  })

  it('handles fractional hours (30-minute window → 0.5h)', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '09:30')])).toBe(0.5)
  })

  it('handles a WorkPeriod that spans midnight', () => {
    expect(calculateWorkedHours([makeWindow('23:00', '01:00')])).toBe(2)
  })

  it('skips an open WorkPeriod (null end) when no now is provided', () => {
    expect(calculateWorkedHours([makeWindow('09:00', null)])).toBe(0)
  })

  it('skips open windows but counts closed ones in a mixed list', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', null)]
    expect(calculateWorkedHours(windows)).toBe(3)
  })

  it('includes open window live duration when now is provided', () => {
    const windows = [makeWindow('09:00', null)]
    expect(calculateWorkedHours(windows, '11:00')).toBe(2)
  })

  it('sums closed and open windows when now is provided', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', null)]
    expect(calculateWorkedHours(windows, '15:00')).toBe(5)
  })
})

describe('calcSubtaskHours', () => {
  it('computes exact decimal hours between two times', () => {
    expect(calcSubtaskHours('09:00', '10:30')).toBe(1.5)
  })

  it('computes fractional minutes exactly (73 min = 73/60 h)', () => {
    expect(calcSubtaskHours('09:00', '10:13')).toBeCloseTo(73 / 60, 10)
  })

  it('returns 0 when start and stop are the same', () => {
    expect(calcSubtaskHours('09:00', '09:00')).toBe(0)
  })

  it('handles midnight crossing (23:00 → 01:00 = 2h)', () => {
    expect(calcSubtaskHours('23:00', '01:00')).toBe(2)
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
