import { describe, it, expect } from 'vitest'
import { getDayStatus, type DayStatus } from './dayStatus'

describe('getDayStatus', () => {
  const today = '2026-05-19'

  it('returns "non-working" for weekends/holidays/vacation/etc', () => {
    expect(getDayStatus({ dayType: 'Weekend', hasWorkedHours: false, isoDate: '2026-05-17', today })).toBe('non-working')
    expect(getDayStatus({ dayType: 'PublicHoliday', hasWorkedHours: false, isoDate: '2026-05-01', today })).toBe('non-working')
    expect(getDayStatus({ dayType: 'Vacation', hasWorkedHours: false, isoDate: '2026-05-12', today })).toBe('non-working')
    expect(getDayStatus({ dayType: 'SickDay', hasWorkedHours: false, isoDate: '2026-05-12', today })).toBe('non-working')
    expect(getDayStatus({ dayType: 'Absence', hasWorkedHours: false, isoDate: '2026-05-12', today })).toBe('non-working')
  })

  it('returns "tracked" for work days with hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isoDate: '2026-05-15', today })).toBe('tracked')
  })

  it('returns "needs-attention" for past work days without hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: '2026-05-15', today })).toBe('needs-attention')
  })

  it('returns "today" for current day work day without hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: today, today })).toBe('today')
  })

  it('returns "tracked" for today if it has hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isoDate: today, today })).toBe('tracked')
  })

  it('returns "future" for work days in the future without hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isoDate: '2026-05-20', today })).toBe('future')
  })

  it('returns "tracked" for future days that already have hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isoDate: '2026-05-20', today })).toBe('tracked')
  })
})
