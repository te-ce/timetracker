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
    trackingElapsed: 0,
    liveElapsed: 0,
    timeFormat: 'decimal' as const,
    autoCategory: '_COREMEDIA',
    categories: ['_COREMEDIA', '_SUPPORT', '_INFRA'],
    windows: [makePeriod()],
    isTracking: true,
    startedAt: '2026-06-09T09:00:00Z',
  }

  describe('badgeLabel', () => {
    it('shows remaining when remaining > 0', () => {
      const result = buildTrayState(baseInput)
      expect(result.badgeLabel).toBe('5.00h left')
    })

    it('shows Done when remaining = 0', () => {
      const result = buildTrayState({ ...baseInput, workedHours: 8 })
      expect(result.badgeLabel).toBe('Done')
    })

    it('shows overtime when remaining < 0', () => {
      const result = buildTrayState({ ...baseInput, workedHours: 9 })
      expect(result.badgeLabel).toBe('1.00h overtime')
    })

    it('accounts for priorOvertime in remaining', () => {
      const result = buildTrayState({ ...baseInput, priorOvertime: 2 })
      expect(result.badgeLabel).toBe('3.00h left')
    })

    it('accounts for trackingElapsed in remaining', () => {
      const result = buildTrayState({ ...baseInput, trackingElapsed: 1 })
      expect(result.badgeLabel).toBe('4.00h left')
    })
  })

  describe('receiptLines', () => {
    it('returns receipt-style lines with target, worked, and total', () => {
      const result = buildTrayState(baseInput)
      expect(result.receiptLines[0]).toEqual({ label: 'Target', value: '8.00h' })
      const workedLine = result.receiptLines.find((l) => l.label === 'Worked today')
      expect(workedLine).toEqual({ label: 'Worked today', value: '-3.00h' })
      const totalLine = result.receiptLines.find((l) => l.isTotal)
      expect(totalLine).toMatchObject({ label: 'Remaining', isTotal: true })
    })

    it('includes tracking line when trackingElapsed > 0', () => {
      const result = buildTrayState({ ...baseInput, trackingElapsed: 1.5 })
      const trackingLine = result.receiptLines.find((l) => l.label === 'Tracking')
      expect(trackingLine).toEqual({ label: 'Tracking', value: '-1.50h' })
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
    it('returns null when open period has no live subtask', () => {
      const result = buildTrayState(baseInput)
      expect(result.activeSubtaskCategory).toBeNull()
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

    it('ignores stopped subtasks', () => {
      const windows = [
        makePeriod({
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
      expect(result.activeSubtaskCategory).toBeNull()
    })
  })

  describe('categories', () => {
    it('passes through categories list', () => {
      const result = buildTrayState(baseInput)
      expect(result.categories).toEqual(['_COREMEDIA', '_SUPPORT', '_INFRA'])
    })
  })

  describe('isTracking and startedAt', () => {
    it('reflects tracking state', () => {
      const result = buildTrayState(baseInput)
      expect(result.isTracking).toBe(true)
      expect(result.startedAt).toBe('2026-06-09T09:00:00Z')
    })

    it('shows not tracking when isTracking is false', () => {
      const result = buildTrayState({ ...baseInput, isTracking: false, startedAt: null })
      expect(result.isTracking).toBe(false)
      expect(result.startedAt).toBeNull()
    })
  })
})
