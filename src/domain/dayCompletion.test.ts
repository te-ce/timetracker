import { describe, it, expect } from 'vitest'
import { isDayComplete } from './dayCompletion'

describe('isDayComplete', () => {
  it('returns true for non-WorkDay regardless of windows', () => {
    expect(isDayComplete('Weekend', false)).toBe(true)
    expect(isDayComplete('PublicHoliday', false)).toBe(true)
    expect(isDayComplete('Vacation', false)).toBe(true)
    expect(isDayComplete('SickDay', false)).toBe(true)
    expect(isDayComplete('Absence', false)).toBe(true)
  })

  it('returns true for WorkDay with at least one WorkWindow', () => {
    expect(isDayComplete('WorkDay', true)).toBe(true)
  })

  it('returns false for WorkDay with no WorkWindows', () => {
    expect(isDayComplete('WorkDay', false)).toBe(false)
  })
})
