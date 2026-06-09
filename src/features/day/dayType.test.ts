// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { classifyDayType, isWorkPeriodExpected, getAutoBooking } from './dayType'
import type { DayType } from './dayType'

// 2024-01-13 = Saturday, 2024-01-14 = Sunday, 2024-01-15 = Monday
const SAT = new Date('2024-01-13')
const SUN = new Date('2024-01-14')
const MON = new Date('2024-01-15')

describe('classifyDayType', () => {
  it('classifies Saturday as Weekend', () => {
    expect(classifyDayType(SAT)).toBe('Weekend')
  })

  it('classifies Sunday as Weekend', () => {
    expect(classifyDayType(SUN)).toBe('Weekend')
  })

  it('classifies a weekday as WorkDay', () => {
    expect(classifyDayType(MON)).toBe('WorkDay')
  })

  it('classifies a weekday as PublicHoliday when in holiday set', () => {
    const holidays = new Set(['2024-01-15'])
    expect(classifyDayType(MON, holidays)).toBe('PublicHoliday')
  })

  it('still classifies weekend even if in holiday set', () => {
    const holidays = new Set(['2024-01-13'])
    expect(classifyDayType(SAT, holidays)).toBe('Weekend')
  })
})

describe('isWorkPeriodExpected', () => {
  it('returns true only for WorkDay', () => {
    expect(isWorkPeriodExpected('WorkDay')).toBe(true)
  })

  it.each<DayType>(['Weekend', 'PublicHoliday', 'Vacation', 'SickDay'])('returns false for %s', (dayType) => {
    expect(isWorkPeriodExpected(dayType)).toBe(false)
  })
})

describe('getAutoBooking', () => {
  it.each<DayType>(['Vacation', 'SickDay'])('books Sollstunden to "On Leave" for %s', (dayType) => {
    const booking = getAutoBooking(dayType, 8)
    expect(booking).toEqual({ category: '_LEAVE', hours: 8 })
  })

  it.each<DayType>(['WorkDay', 'Weekend', 'PublicHoliday'])('returns null for %s', (dayType) => {
    expect(getAutoBooking(dayType, 8)).toBeNull()
  })
})
