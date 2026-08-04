// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { classifyDay } from './dayStatus'

const today = '2026-05-19'

function classify(overrides: Partial<Parameters<typeof classifyDay>[0]>) {
  return classifyDay({
    dayType: 'WorkDay',
    workedHours: 0,
    manualTotal: 0,
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

  it('returns leave for Vacation and SickDay', () => {
    expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12' }).status).toBe('leave')
    expect(classify({ dayType: 'SickDay', isoDate: '2026-05-12' }).status).toBe('leave')
  })

  it('exposes leaveType for leave days', () => {
    expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12' }).leaveType).toBe('Vacation')
    expect(classify({ dayType: 'SickDay', isoDate: '2026-05-12' }).leaveType).toBe('SickDay')
  })

  it('leaveType is undefined for non-leave days', () => {
    expect(classify({ dayType: 'WorkDay', workedHours: 8, manualTotal: 8 }).leaveType).toBeUndefined()
    expect(classify({ dayType: 'Weekend', isoDate: '2026-05-17' }).leaveType).toBeUndefined()
  })

  it('returns complete for past work days with hours', () => {
    expect(classify({ workedHours: 8, manualTotal: 8 }).status).toBe('complete')
  })

  it('returns needs-review for past work days where categorized hours exceed worked hours', () => {
    expect(classify({ workedHours: 4, manualTotal: 8 }).status).toBe('needs-review')
  })

  it('returns complete for past work days with worked hours exceeding categorized hours', () => {
    expect(classify({ workedHours: 8, manualTotal: 4 }).status).toBe('complete')
  })

  it('returns untracked for past work days with no hours and no entries', () => {
    expect(classify({ workedHours: 0, manualTotal: 0 }).status).toBe('untracked')
  })

  it('returns today for current day', () => {
    expect(classify({ isoDate: today }).status).toBe('today')
    expect(classify({ isoDate: today, workedHours: 8, manualTotal: 8 }).status).toBe('today')
    expect(classify({ isoDate: today, workedHours: 8, manualTotal: 0 }).status).toBe('today')
  })

  it('returns future for work days in the future without hours', () => {
    expect(classify({ isoDate: '2026-05-20' }).status).toBe('future')
  })

  it('returns complete for future days that already have hours', () => {
    expect(classify({ isoDate: '2026-05-20', workedHours: 8, manualTotal: 8 }).status).toBe('complete')
  })

  describe('displayStatus', () => {
    it('resolves today to underlying work status', () => {
      expect(classify({ isoDate: today, workedHours: 8, manualTotal: 8 }).displayStatus).toBe('complete')
      expect(classify({ isoDate: today }).displayStatus).toBe('untracked')
      expect(classify({ isoDate: today, workedHours: 4, manualTotal: 8 }).displayStatus).toBe('needs-review')
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
      expect(classify({ workedHours: 8, manualTotal: 8 }).reason).not.toMatch(/^Today — /)
    })

    it('returns correct reason for weekend', () => {
      expect(classify({ dayType: 'Weekend', isoDate: '2026-05-17' }).reason).toBe('Weekend')
    })

    it('returns correct reason for vacation', () => {
      expect(classify({ dayType: 'Vacation', isoDate: '2026-05-12' }).reason).toBe('Marked as vacation')
    })

    it('returns correct reason for public holiday', () => {
      expect(classify({ dayType: 'PublicHoliday', isoDate: '2026-05-01' }).reason).toBe('Public holiday')
    })

    it('returns correct reason for sick day', () => {
      expect(classify({ dayType: 'SickDay', isoDate: '2026-05-12' }).reason).toBe('Marked as sick day')
    })

    it('returns future reason for future work days', () => {
      expect(classify({ isoDate: '2026-05-20' }).reason).toBe('Future work day — no hours yet')
    })

    it('returns logged-ahead reason for future days with hours', () => {
      expect(classify({ isoDate: '2026-05-20', workedHours: 4 }).reason).toBe('4.0 h logged ahead of schedule')
    })

    it('returns no-hours reason for untracked days', () => {
      expect(classify({ workedHours: 0, manualTotal: 0 }).reason).toBe('No hours recorded')
    })

    describe('balanceReason', () => {
      it('reports just worked hours when categorized hours do not exceed worked hours', () => {
        expect(classify({ workedHours: 8, manualTotal: 8 }).reason).toBe('8.0 h worked')
        expect(classify({ workedHours: 8, manualTotal: 3 }).reason).toBe('8.0 h worked')
      })

      it('reports over-booked when manualTotal > workedHours', () => {
        const result = classify({ workedHours: 6, manualTotal: 8 })
        expect(result.reason).toContain('8.0 h booked')
        expect(result.reason).toContain('2.0 h over')
      })

      it('reports over-booked when workedHours is 0 and manualTotal > 0', () => {
        const result = classify({ workedHours: 0, manualTotal: 3 })
        expect(result.reason).toContain('3.0 h booked')
        expect(result.reason).toContain('3.0 h over')
      })
    })
  })
})
