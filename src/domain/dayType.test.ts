import { describe, it, expect } from 'vitest'
import { classifyDay, isWorkPeriodExpected, getAutoBooking } from './dayType'
import type { DayType } from './dayType'

// 2024-01-13 = Saturday, 2024-01-14 = Sunday, 2024-01-15 = Monday
const SAT = new Date('2024-01-13')
const SUN = new Date('2024-01-14')
const MON = new Date('2024-01-15')

describe('classifyDay', () => {
  it('classifies Saturday as Weekend', () => {
    expect(classifyDay(SAT)).toBe('Weekend')
  })

  it('classifies Sunday as Weekend', () => {
    expect(classifyDay(SUN)).toBe('Weekend')
  })

  it('classifies a weekday as WorkDay', () => {
    expect(classifyDay(MON)).toBe('WorkDay')
  })

  it('classifies a weekday as PublicHoliday when in holiday set', () => {
    const holidays = new Set(['2024-01-15'])
    expect(classifyDay(MON, holidays)).toBe('PublicHoliday')
  })

  it('still classifies weekend even if in holiday set', () => {
    const holidays = new Set(['2024-01-13'])
    expect(classifyDay(SAT, holidays)).toBe('Weekend')
  })
})

describe('isWorkPeriodExpected', () => {
  it('returns true only for WorkDay', () => {
    expect(isWorkPeriodExpected('WorkDay')).toBe(true)
  })

  it.each<DayType>(['Weekend', 'PublicHoliday', 'Vacation', 'SickDay', 'Absence'])(
    'returns false for %s',
    (dayType) => {
      expect(isWorkPeriodExpected(dayType)).toBe(false)
    },
  )
})

describe('getAutoBooking', () => {
  it.each<DayType>(['Vacation', 'SickDay', 'Absence'])('books Sollstunden to "On Leave" for %s', (dayType) => {
    const booking = getAutoBooking(dayType, 8)
    expect(booking).toEqual({ category: '_LEAVE', hours: 8 })
  })

  it.each<DayType>(['WorkDay', 'Weekend', 'PublicHoliday'])('returns null for %s', (dayType) => {
    expect(getAutoBooking(dayType, 8)).toBeNull()
  })
})
