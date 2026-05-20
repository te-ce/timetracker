import { describe, it, expect } from 'vitest'
import { getDayStatus, type DayStatus } from './dayStatus'

describe('getDayStatus', () => {
  const today = '2026-05-19'

  it('returns "non-working" for weekends and public holidays', () => {
    expect(getDayStatus({ dayType: 'Weekend', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-17', today })).toBe('non-working')
    expect(getDayStatus({ dayType: 'PublicHoliday', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-01', today })).toBe('non-working')
  })

  it('returns "leave" for Vacation, SickDay, Absence', () => {
    expect(getDayStatus({ dayType: 'Vacation', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-12', today })).toBe('leave')
    expect(getDayStatus({ dayType: 'SickDay', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-12', today })).toBe('leave')
    expect(getDayStatus({ dayType: 'Absence', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-12', today })).toBe('leave')
  })

  it('returns "tracked" for past work days with balanced entries', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: true, hasAutoCategory: false, isoDate: '2026-05-15', today })).toBe('complete')
  })

  it('returns "incomplete" for past work days with hours but unbalanced entries', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-15', today })).toBe('incomplete')
  })

  it('returns "untracked" for past work days without hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-15', today })).toBe('untracked')
  })

  it('returns "today" for current day', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: today, today })).toBe('today')
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: true, hasAutoCategory: false, isoDate: today, today })).toBe('today')
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: false, hasAutoCategory: false, isoDate: today, today })).toBe('today')
  })

  it('returns "future" for work days in the future without hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: false, isEntriesBalanced: false, hasAutoCategory: false, isoDate: '2026-05-20', today })).toBe('future')
  })

  it('returns "tracked" for future days that already have hours', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: true, hasAutoCategory: false, isoDate: '2026-05-20', today })).toBe('complete')
  })

  it('returns "tracked" when auto category absorbs remaining', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: false, hasAutoCategory: true, isoDate: '2026-05-15', today })).toBe('complete')
  })

  it('returns "tracked" when day is confirmed even if unbalanced', () => {
    expect(getDayStatus({ dayType: 'WorkDay', hasWorkedHours: true, isEntriesBalanced: false, hasAutoCategory: false, isConfirmed: true, isoDate: '2026-05-15', today })).toBe('complete')
  })
})
