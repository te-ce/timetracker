import { describe, it, expect } from 'vitest'
import { classifyDay } from './dayStatus'

const today = '2026-05-19'

function classify(overrides: Partial<Parameters<typeof classifyDay>[0]>) {
  return classifyDay({
    dayType: 'WorkDay',
    workedHours: 0,
    manualTotal: 0,
    isEntriesBalanced: false,
    hasAutoCategory: false,
    isConfirmed: false,
    isoDate: '2026-05-15',
    today,
    ...overrides,
  })
}

describe('classifyDay', () => {
  it('returns non-working for weekends and public holidays', () => {
    expect(classify({ dayType: 'Weekend', isoDate: '2026-05-17' }).status).toBe('non-working')
    expect(classify({ dayType: 'PublicHoliday', isoDate: '2026-05-01' }).status).toBe('non-working')
  })

  it('returns leave for Vacation, SickDay, Absence', () => {
    expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12' }).status).toBe('leave')
    expect(classify({ dayType: 'SickDay', isoDate: '2026-05-12' }).status).toBe('leave')
    expect(classify({ dayType: 'Absence', isoDate: '2026-05-12' }).status).toBe('leave')
  })

  it('returns complete for past work days with balanced entries', () => {
    expect(classify({ workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).status).toBe('complete')
  })

  it('returns needs-review for past work days with hours but unbalanced entries', () => {
    expect(classify({ workedHours: 8, manualTotal: 4, isEntriesBalanced: false }).status).toBe('needs-review')
  })

  it('returns needs-review for past work days with entries but no worked hours', () => {
    expect(classify({ workedHours: 0, manualTotal: 4, isEntriesBalanced: false }).status).toBe('needs-review')
  })

  it('returns untracked for past work days with no hours and no entries', () => {
    expect(classify({ workedHours: 0, manualTotal: 0 }).status).toBe('untracked')
  })

  it('returns today for current day', () => {
    expect(classify({ isoDate: today }).status).toBe('today')
    expect(classify({ isoDate: today, workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).status).toBe('today')
    expect(classify({ isoDate: today, workedHours: 8, manualTotal: 0 }).status).toBe('today')
  })

  it('returns future for work days in the future without hours', () => {
    expect(classify({ isoDate: '2026-05-20' }).status).toBe('future')
  })

  it('returns complete for future days that already have hours', () => {
    expect(classify({ isoDate: '2026-05-20', workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).status).toBe(
      'complete',
    )
  })

  it('returns needs-review when auto category covers remaining but entries are not balanced', () => {
    expect(classify({ workedHours: 8, manualTotal: 4, hasAutoCategory: true }).status).toBe('needs-review')
  })

  it('returns confirmed for past work days with isConfirmed true', () => {
    expect(classify({ workedHours: 8, manualTotal: 8, isEntriesBalanced: true, isConfirmed: true }).status).toBe(
      'confirmed',
    )
  })

  it('confirmed takes precedence over balance — confirmed + unbalanced still returns confirmed', () => {
    expect(classify({ workedHours: 8, manualTotal: 4, isEntriesBalanced: false, isConfirmed: true }).status).toBe(
      'confirmed',
    )
  })

  it('returns today for confirmed current day, with displayStatus confirmed', () => {
    const result = classify({
      isoDate: today,
      workedHours: 8,
      manualTotal: 8,
      isEntriesBalanced: true,
      isConfirmed: true,
    })
    expect(result.status).toBe('today')
    expect(result.displayStatus).toBe('confirmed')
  })

  it('isConfirmed is ignored for untracked days — no hours means untracked, not confirmed', () => {
    expect(classify({ workedHours: 0, manualTotal: 0, isConfirmed: true }).status).toBe('untracked')
  })

  it('isConfirmed is ignored for leave days — leave takes priority', () => {
    expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12', isConfirmed: true }).status).toBe('leave')
    expect(classify({ dayType: 'SickDay', isoDate: '2026-05-12', isConfirmed: true }).status).toBe('leave')
  })

  it('isConfirmed is ignored for future days with no hours', () => {
    expect(classify({ isoDate: '2026-05-20', isConfirmed: true }).status).toBe('future')
  })

  describe('displayStatus', () => {
    it('resolves today to underlying work status', () => {
      expect(classify({ isoDate: today, workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).displayStatus).toBe(
        'complete',
      )
      expect(classify({ isoDate: today }).displayStatus).toBe('untracked')
      expect(classify({ isoDate: today, workedHours: 8, manualTotal: 4 }).displayStatus).toBe('needs-review')
    })

    it('confirmed displayStatus is confirmed for both today and past days', () => {
      expect(classify({ workedHours: 8, isConfirmed: true }).displayStatus).toBe('confirmed')
      expect(classify({ isoDate: today, workedHours: 8, isConfirmed: true }).displayStatus).toBe('confirmed')
    })

    it('future resolves displayStatus to future', () => {
      expect(classify({ isoDate: '2026-05-20' }).displayStatus).toBe('future')
    })
  })

  describe('reason', () => {
    it('includes today prefix for current day', () => {
      expect(classify({ isoDate: today }).reason).toMatch(/^Today — /)
    })

    it('does not include today prefix for past days', () => {
      expect(classify({ workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).reason).not.toMatch(/^Today — /)
    })

    it('confirmed reason includes Confirmed prefix and balance detail', () => {
      expect(classify({ workedHours: 8, manualTotal: 8, isEntriesBalanced: true, isConfirmed: true }).reason).toMatch(
        /^Confirmed — /,
      )
    })

    it('today+confirmed reason includes both Today and Confirmed prefixes', () => {
      expect(
        classify({ isoDate: today, workedHours: 8, manualTotal: 8, isEntriesBalanced: true, isConfirmed: true }).reason,
      ).toMatch(/^Today — Confirmed — /)
    })

    it('returns correct reason for weekend', () => {
      expect(classify({ dayType: 'Weekend', isoDate: '2026-05-17' }).reason).toBe('Weekend')
    })

    it('returns correct reason for vacation', () => {
      expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12' }).reason).toBe('Marked as vacation')
    })
  })
})
