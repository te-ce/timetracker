import { describe, it, expect } from 'vitest'
import { getDayStatus, type DayStatus } from './dayStatus'

describe('getDayStatus', () => {
  const today = '2026-05-19'

  it('returns "non-working" for weekends/holidays/vacation/etc', () => {
    expect(getDayStatus({ dayType: 'Weekend', hasWorkedHours: false, isoDate: '2026-05-17', today, hasAnyTrackedHours: true })).toBe('non-working')
    expect(getDayStatus({ dayType: 'PublicHoliday', hasWorkedHours: false, isoDate: '2026-05-01', today, hasAnyTrackedHours: true })).toBe('non-working')
    expect(getDayStatus({ dayType: 'Vacation', hasWorkedHours: false, isoDate: '2026-05-12', today, hasAnyTrackedHours: true })).toBe('non-working')
    expect(getDayStatus({ dayType: 'SickDay', hasWorkedHours: false, isoDate: '2026-05-12', today, hasAnyTrackedHours: true })).toBe('non-working')
    expect(getDayStatus({ dayType: 'Absence', hasWorkedHours: false, isoDate: '2026-05-12', today, hasAnyTrackedHours: true })).toBe('non-working')
  })

  it('returns "tracked" for past work days with hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isoDate: '2026-05-15', today, hasAnyTrackedHours: true })).toBe('tracked')
  })

  it('returns "needs-attention" for past work days without hours when month has tracked hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: '2026-05-15', today, hasAnyTrackedHours: true })).toBe('needs-attention')
  })

  it('returns "future" for past work days without hours when no hours tracked at all', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: '2026-05-15', today, hasAnyTrackedHours: false })).toBe('future')
  })

  it('returns "today" for current day work day without hours and no tracked month', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: today, today, hasAnyTrackedHours: false })).toBe('today')
  })

  it('returns "today-needs-attention" for today without hours when month has tracked hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: today, today, hasAnyTrackedHours: true })).toBe('today-needs-attention')
  })

  it('returns "today-tracked" for today with hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isoDate: today, today, hasAnyTrackedHours: true })).toBe('today-tracked')
  })

  it('returns "future" for work days in the future without hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: '2026-05-20', today, hasAnyTrackedHours: true })).toBe('future')
  })

  it('returns "tracked" for future days that already have hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isoDate: '2026-05-20', today, hasAnyTrackedHours: true })).toBe('tracked')
  })
})
