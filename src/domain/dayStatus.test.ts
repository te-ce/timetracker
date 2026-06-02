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

  it('isConfirmed does not affect status — confirmation is an overlay on DaySummary', () => {
    expect(classify({ workedHours: 8, manualTotal: 4, isConfirmed: true }).status).toBe('needs-review')
    expect(classify({ workedHours: 8, manualTotal: 8, isEntriesBalanced: true, isConfirmed: true }).status).toBe(
      'complete',
    )
  })

  describe('displayStatus', () => {
    it('resolves today to underlying work status', () => {
      expect(classify({ isoDate: today, workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).displayStatus).toBe(
        'complete',
      )
      expect(classify({ isoDate: today }).displayStatus).toBe('untracked')
      expect(classify({ isoDate: today, workedHours: 8, manualTotal: 4 }).displayStatus).toBe('needs-review')
    })

    it('future resolves displayStatus to untracked', () => {
      expect(classify({ isoDate: '2026-05-20' }).displayStatus).toBe('untracked')
    })
  })

  describe('reason', () => {
    it('includes today prefix for current day', () => {
      expect(classify({ isoDate: today }).reason).toMatch(/^Today — /)
    })

    it('does not include today prefix for past days', () => {
      expect(classify({ workedHours: 8, manualTotal: 8, isEntriesBalanced: true }).reason).not.toMatch(/^Today — /)
    })

    it('returns correct reason for weekend', () => {
      expect(classify({ dayType: 'Weekend', isoDate: '2026-05-17' }).reason).toBe('Weekend')
    })

    it('returns correct reason for vacation', () => {
      expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12' }).reason).toBe('Marked as vacation')
    })
  })
})
