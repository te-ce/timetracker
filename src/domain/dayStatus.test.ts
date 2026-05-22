import { describe, it, expect } from 'vitest'
import { getDayStatus } from './dayStatus'

describe('getDayStatus', () => {
  const today = '2026-05-19'

  it('returns "non-working" for weekends and public holidays', () => {
    expect(
      getDayStatus({
        dayType: 'Weekend',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-17',
        today,
      }),
    ).toBe('non-working')
    expect(
      getDayStatus({
        dayType: 'PublicHoliday',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-01',
        today,
      }),
    ).toBe('non-working')
  })

  it('returns "leave" for Vacation, SickDay, Absence', () => {
    expect(
      getDayStatus({
        dayType: 'Vacation',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-12',
        today,
      }),
    ).toBe('leave')
    expect(
      getDayStatus({
        dayType: 'SickDay',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-12',
        today,
      }),
    ).toBe('leave')
    expect(
      getDayStatus({
        dayType: 'Absence',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-12',
        today,
      }),
    ).toBe('leave')
  })

  it('returns "complete" for past work days with balanced entries', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: true,
        isEntriesBalanced: true,
        hasAutoCategory: false,
        isoDate: '2026-05-15',
        today,
      }),
    ).toBe('complete')
  })

  it('returns "needs-review" for past work days with hours but unbalanced entries', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: true,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-15',
        today,
      }),
    ).toBe('needs-review')
  })

  it('returns "needs-review" for past work days with entries but no worked hours', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: false,
        hasManualEntries: true,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-15',
        today,
      }),
    ).toBe('needs-review')
  })

  it('returns "untracked" for past work days with no hours and no entries', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-15',
        today,
      }),
    ).toBe('untracked')
  })

  it('returns "today" for current day', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: today,
        today,
      }),
    ).toBe('today')
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: true,
        isEntriesBalanced: true,
        hasAutoCategory: false,
        isoDate: today,
        today,
      }),
    ).toBe('today')
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: today,
        today,
      }),
    ).toBe('today')
  })

  it('returns "future" for work days in the future without hours', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: false,
        hasManualEntries: false,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isoDate: '2026-05-20',
        today,
      }),
    ).toBe('future')
  })

  it('returns "complete" for future days that already have hours', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: true,
        isEntriesBalanced: true,
        hasAutoCategory: false,
        isoDate: '2026-05-20',
        today,
      }),
    ).toBe('complete')
  })

  it('returns "complete" when auto category absorbs remaining', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: true,
        isEntriesBalanced: false,
        hasAutoCategory: true,
        isoDate: '2026-05-15',
        today,
      }),
    ).toBe('complete')
  })

  it('returns "complete" when day is confirmed even if unbalanced', () => {
    expect(
      getDayStatus({
        dayType: 'WorkDay',
        hasWorkedHours: true,
        hasManualEntries: true,
        isEntriesBalanced: false,
        hasAutoCategory: false,
        isConfirmed: true,
        isoDate: '2026-05-15',
        today,
      }),
    ).toBe('complete')
  })
})
