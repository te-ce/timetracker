import { describe, it, expect } from 'vitest'
import { toLocalIso } from './dateUtils'

describe('toLocalIso', () => {
  it('formats a date as YYYY-MM-DD using local timezone', () => {
    const date = new Date(2026, 4, 19) // May 19, 2026 local
    expect(toLocalIso(date)).toBe('2026-05-19')
  })

  it('pads single-digit month and day', () => {
    const date = new Date(2026, 0, 5) // Jan 5
    expect(toLocalIso(date)).toBe('2026-01-05')
  })

  it('does not shift date in positive UTC offset timezones', () => {
    // new Date(year, month, day) creates midnight local time.
    // In UTC+2, midnight local = 22:00 previous day UTC.
    // toISOString() would return the previous day — toLocalIso must not.
    const date = new Date(2026, 4, 19) // May 19 local
    // Verify our function returns the local date regardless of UTC conversion
    expect(toLocalIso(date)).toBe('2026-05-19')
    // Compare with the broken approach:
    const _utcIso = date.toISOString().slice(0, 10)
    expect(_utcIso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // In UTC+X timezones, this would be '2026-05-18'
    // We can't assert the exact UTC value in CI (depends on TZ), but we CAN
    // assert that toLocalIso always matches the constructor args:
    expect(date.getDate()).toBe(19)
    expect(toLocalIso(date)).toBe('2026-05-19')
  })

  it('handles end of month correctly', () => {
    expect(toLocalIso(new Date(2026, 0, 31))).toBe('2026-01-31')
    expect(toLocalIso(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('handles leap year Feb 29', () => {
    expect(toLocalIso(new Date(2024, 1, 29))).toBe('2024-02-29')
  })
})
