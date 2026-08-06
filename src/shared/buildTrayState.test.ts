// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildTrayState } from './buildTrayState'

interface WorkPeriod {
  id: string
  start: string
  end: string | null
  category: string
  subtasks: Array<{ id: string; category: string; hours: number; startedAt?: string; stoppedAt?: string }>
}

function makePeriod(overrides: Partial<WorkPeriod> = {}): WorkPeriod {
  return {
    id: 'wp1',
    start: '09:00',
    end: null,
    category: '_COREMEDIA',
    subtasks: [],
    ...overrides,
  }
}

describe('buildTrayState', () => {
  const baseInput = {
    sollstunden: 8,
    priorOvertime: 0,
    workedHours: 3,
    liveElapsed: 0,
    remaining: 5,
    timeFormat: 'decimal' as const,
    autoCategory: '_COREMEDIA',
    categories: ['_COREMEDIA', '_SUPPORT', '_INFRA'],
    windows: [makePeriod()],
    isTracking: true,
    startedAt: '2026-06-09T09:00:00Z',
    nowHHMM: '10:00',
  }

  describe('badgeLabel', () => {
    it('shows remaining when remaining > 0', () => {
      const result = buildTrayState(baseInput)
      expect(result.badgeLabel).toBe('5.00h left')
    })

    it('shows Done when remaining = 0', () => {
      const result = buildTrayState({ ...baseInput, workedHours: 8, remaining: 0 })
      expect(result.badgeLabel).toBe('Done')
    })

    it('shows overtime when remaining < 0', () => {
      const result = buildTrayState({ ...baseInput, workedHours: 9, remaining: -1 })
      expect(result.badgeLabel).toBe('1.00h overtime')
    })

    it('accounts for priorOvertime in remaining', () => {
      const result = buildTrayState({ ...baseInput, priorOvertime: 2, remaining: 3 })
      expect(result.badgeLabel).toBe('3.00h left')
    })

    it('ignores priorOvertime when remainingTimeMode is until-daily-target', () => {
      const result = buildTrayState({
        ...baseInput,
        priorOvertime: 2,
        remaining: 5,
        remainingTimeMode: 'until-daily-target',
      })
      expect(result.badgeLabel).toBe('5.00h left')
    })

    it('uses priorOvertime when remainingTimeMode is until-zero-overtime', () => {
      const result = buildTrayState({
        ...baseInput,
        priorOvertime: 2,
        remaining: 3,
        remainingTimeMode: 'until-zero-overtime',
      })
      expect(result.badgeLabel).toBe('3.00h left')
    })

    it('accounts for liveElapsed in remaining', () => {
      const result = buildTrayState({ ...baseInput, liveElapsed: 1, remaining: 4 })
      expect(result.badgeLabel).toBe('4.00h left')
    })
  })

  describe('receiptLines', () => {
    it('returns Required as first line with target minus carry-over', () => {
      // baseInput: sollstunden=8, priorOvertime=0, workedHours=3 → required=8
      const result = buildTrayState(baseInput)
      expect(result.receiptLines[0]).toMatchObject({ label: 'Required', value: '8.00h' })
    })

    it('marks Target and carry-over as sub-items', () => {
      const result = buildTrayState(baseInput)
      expect(result.receiptLines.find((l) => l.label === 'Target')).toMatchObject({ isSubItem: true })
      expect(result.receiptLines.find((l) => l.label.includes('carry'))).toMatchObject({ isSubItem: true })
    })

    it('shows Worked with totalWorked value and Past as sub-item', () => {
      const result = buildTrayState(baseInput)
      const workedLine = result.receiptLines.find((l) => l.label === 'Worked')
      expect(workedLine?.value).toContain('3')
      expect(result.receiptLines.find((l) => l.label === 'Past')).toMatchObject({ isSubItem: true, value: '3.00h' })
    })

    it('shows total line as isTotal', () => {
      const result = buildTrayState(baseInput)
      const totalLine = result.receiptLines.find((l) => l.isTotal)
      expect(totalLine).toMatchObject({ label: 'Remaining', isTotal: true })
    })

    it('includes Current sub-item when liveElapsed > 0', () => {
      const result = buildTrayState({ ...baseInput, liveElapsed: 1.5, remaining: 3.5 })
      expect(result.receiptLines.find((l) => l.label === 'Current')).toMatchObject({
        isSubItem: true,
        value: '1.50h',
      })
    })
  })

  describe('autoCategory', () => {
    it('passes through the auto category', () => {
      const result = buildTrayState(baseInput)
      expect(result.autoCategory).toBe('_COREMEDIA')
    })

    it('returns null when no auto category configured', () => {
      const result = buildTrayState({ ...baseInput, autoCategory: null })
      expect(result.autoCategory).toBeNull()
    })
  })

  describe('activeSubtaskCategory', () => {
    it('falls back to the open period own category when it has no live subtask', () => {
      const result = buildTrayState(baseInput)
      expect(result.activeSubtaskCategory).toBe('_COREMEDIA')
    })

    it('returns the category of a live subtask on the open period', () => {
      const windows = [
        makePeriod({
          subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '2026-06-09T10:00:00Z' }],
        }),
      ]
      const result = buildTrayState({ ...baseInput, windows })
      expect(result.activeSubtaskCategory).toBe('_SUPPORT')
    })

    it('falls back to the open period category when subtasks are all stopped', () => {
      const windows = [
        makePeriod({
          category: '_MAINT',
          subtasks: [
            {
              id: 's1',
              category: '_SUPPORT',
              hours: 1,
              startedAt: '2026-06-09T10:00:00Z',
              stoppedAt: '2026-06-09T11:00:00Z',
            },
          ],
        }),
      ]
      const result = buildTrayState({ ...baseInput, windows })
      expect(result.activeSubtaskCategory).toBe('_MAINT')
    })

    it('uses the reopened period own category, not the unrelated global autoCategory', () => {
      const windows = [makePeriod({ category: '_MAINT' })]
      const result = buildTrayState({ ...baseInput, windows, autoCategory: '_COREMEDIA' })
      expect(result.activeSubtaskCategory).toBe('_MAINT')
    })

    it('returns null when there is no open or planned-stop period', () => {
      const windows = [makePeriod({ end: '17:00' })]
      const result = buildTrayState({ ...baseInput, windows, nowHHMM: '18:00' })
      expect(result.activeSubtaskCategory).toBeNull()
    })
  })

  describe('categories', () => {
    it('passes through categories list', () => {
      const result = buildTrayState(baseInput)
      expect(result.categories).toEqual(['_COREMEDIA', '_SUPPORT', '_INFRA'])
    })
  })

  describe('showTotalWorked', () => {
    it('shows total worked hours in badge label when showTotalWorked is true', () => {
      const result = buildTrayState({ ...baseInput, showTotalWorked: true })
      expect(result.badgeLabel).toBe('3.00h worked')
    })

    it('includes liveElapsed in total worked when showTotalWorked is true', () => {
      const result = buildTrayState({ ...baseInput, liveElapsed: 1, remaining: 4, showTotalWorked: true })
      expect(result.badgeLabel).toBe('4.00h worked')
    })

    it('still shows remaining when showTotalWorked is false', () => {
      const result = buildTrayState({ ...baseInput, showTotalWorked: false })
      expect(result.badgeLabel).toBe('5.00h left')
    })
  })

  describe('presentingMode', () => {
    it('blanks the badge label when presentingMode is true', () => {
      const result = buildTrayState({ ...baseInput, presentingMode: true })
      expect(result.badgeLabel).toBe('')
    })

    it('blanks the receipt lines when presentingMode is true', () => {
      const result = buildTrayState({ ...baseInput, presentingMode: true })
      expect(result.receiptLines).toEqual([])
    })

    it('still shows the badge label and receipt lines when presentingMode is false', () => {
      const result = buildTrayState({ ...baseInput, presentingMode: false })
      expect(result.badgeLabel).toBe('5.00h left')
      expect(result.receiptLines.length).toBeGreaterThan(0)
    })

    it('passes presentingMode through to the output so the tray menu can reflect it', () => {
      expect(buildTrayState({ ...baseInput, presentingMode: true }).presentingMode).toBe(true)
      expect(buildTrayState({ ...baseInput, presentingMode: false }).presentingMode).toBe(false)
      expect(buildTrayState(baseInput).presentingMode).toBe(false)
    })
  })

  describe('dockMenuLines', () => {
    it('mirrors receiptLines by default', () => {
      const result = buildTrayState(baseInput)
      expect(result.dockMenuLines).toEqual(result.receiptLines)
    })

    it('is empty when showWorkedHoursInTaskMenu is false', () => {
      const result = buildTrayState({ ...baseInput, showWorkedHoursInTaskMenu: false })
      expect(result.dockMenuLines).toEqual([])
    })

    it('is still populated when showWorkedHoursInTaskMenu is false but the tray itself keeps its receiptLines', () => {
      const result = buildTrayState({ ...baseInput, showWorkedHoursInTaskMenu: false })
      expect(result.receiptLines.length).toBeGreaterThan(0)
    })

    it('is blanked when presentingMode is true, regardless of showWorkedHoursInTaskMenu', () => {
      const result = buildTrayState({ ...baseInput, presentingMode: true, showWorkedHoursInTaskMenu: true })
      expect(result.dockMenuLines).toEqual([])
    })
  })

  describe('isOvertimeReady', () => {
    it('shows a loading placeholder for the badge and blanks the receipt while overtime is not ready', () => {
      const result = buildTrayState({ ...baseInput, isOvertimeReady: false })
      expect(result.badgeLabel).toBe('…')
      expect(result.receiptLines).toEqual([])
    })

    it('shows the real badge and receipt once overtime is ready', () => {
      const result = buildTrayState({ ...baseInput, isOvertimeReady: true })
      expect(result.badgeLabel).toBe('5.00h left')
      expect(result.receiptLines.length).toBeGreaterThan(0)
    })

    it('defaults to ready when isOvertimeReady is omitted, for callers that have not adopted it', () => {
      const result = buildTrayState(baseInput)
      expect(result.badgeLabel).toBe('5.00h left')
      expect(result.receiptLines.length).toBeGreaterThan(0)
    })

    it('shows the real worked-hours badge even while not ready when showTotalWorked is true, since it does not depend on the carry-over', () => {
      const result = buildTrayState({ ...baseInput, isOvertimeReady: false, showTotalWorked: true })
      expect(result.badgeLabel).toBe('3.00h worked')
      expect(result.receiptLines).toEqual([])
    })

    it('shows the real badge even while not ready in until-daily-target mode, since remaining does not depend on the carry-over there', () => {
      const result = buildTrayState({
        ...baseInput,
        isOvertimeReady: false,
        remainingTimeMode: 'until-daily-target',
      })
      expect(result.badgeLabel).toBe('5.00h left')
      expect(result.receiptLines).toEqual([])
    })
  })
})
