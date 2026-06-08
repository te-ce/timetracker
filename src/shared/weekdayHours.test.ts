// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { targetHoursForDate, type WeekdayHours } from './weekdayHours'

// 2024-01-15 = Monday, 2024-01-16 = Tuesday, ..., 2024-01-20 = Saturday, 2024-01-21 = Sunday
const MON = new Date('2024-01-15')
const TUE = new Date('2024-01-16')
const WED = new Date('2024-01-17')
const THU = new Date('2024-01-18')
const FRI = new Date('2024-01-19')
const SAT = new Date('2024-01-20')
const SUN = new Date('2024-01-21')

const STANDARD: WeekdayHours = [0, 8, 8, 8, 8, 8, 0] // Sun=0, Mon-Fri=8, Sat=0

describe('targetHoursForDate', () => {
  it('returns Mon target', () => expect(targetHoursForDate(MON, STANDARD)).toBe(8))
  it('returns Tue target', () => expect(targetHoursForDate(TUE, STANDARD)).toBe(8))
  it('returns Wed target', () => expect(targetHoursForDate(WED, STANDARD)).toBe(8))
  it('returns Thu target', () => expect(targetHoursForDate(THU, STANDARD)).toBe(8))
  it('returns Fri target', () => expect(targetHoursForDate(FRI, STANDARD)).toBe(8))
  it('returns 0 for Sat (non-working)', () => expect(targetHoursForDate(SAT, STANDARD)).toBe(0))
  it('returns 0 for Sun (non-working)', () => expect(targetHoursForDate(SUN, STANDARD)).toBe(0))

  it('returns custom Sat hours when set', () => {
    const custom: WeekdayHours = [0, 8, 8, 8, 8, 8, 2]
    expect(targetHoursForDate(SAT, custom)).toBe(2)
  })

  it('returns 0 for Mon when set as non-working', () => {
    const custom: WeekdayHours = [0, 0, 8, 8, 8, 8, 0]
    expect(targetHoursForDate(MON, custom)).toBe(0)
  })

  it('accepts ISO date string', () => {
    expect(targetHoursForDate('2024-01-15', STANDARD)).toBe(8)
  })
})
