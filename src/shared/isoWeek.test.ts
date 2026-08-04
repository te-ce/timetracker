import { describe, it, expect } from 'vitest'
import { isoWeekOf, isoWeekYearOf } from './isoWeek'

describe('isoWeekOf', () => {
  it('numbers a mid-year week', () => {
    expect(isoWeekOf('2026-07-06')).toBe(28)
    expect(isoWeekOf('2026-07-12')).toBe(28)
    expect(isoWeekOf('2026-07-13')).toBe(29)
  })

  it('puts early January into the previous year last week', () => {
    expect(isoWeekOf('2027-01-01')).toBe(53)
  })
})

describe('isoWeekYearOf', () => {
  it('follows the calendar year mid-year', () => {
    expect(isoWeekYearOf('2026-07-06')).toBe(2026)
  })

  it('keeps a January date in the ISO year its week belongs to', () => {
    expect(isoWeekYearOf('2027-01-01')).toBe(2026)
  })
})
