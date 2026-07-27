// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { composeDayContext } from './dayContext'
import type { MonthData } from '../../infra/repositories/types'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

const today = '2026-06-05'
const date = '2026-06-05'

function makeMonthData(overrides: MonthData = {}): MonthData {
  return overrides
}

describe('composeDayContext', () => {
  describe('raw day fields', () => {
    it('returns empty windows when day has no data', () => {
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.windows).toEqual([])
    })

    it('extracts windows from month data', () => {
      const window = { id: 'w1', start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.windows).toHaveLength(1)
      expect(result.windows[0]?.id).toBe('w1')
    })

    it('extracts isConfirmed', () => {
      const monthData = makeMonthData({ [date]: { windows: [], confirmed: true } })
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.isConfirmed).toBe(true)
    })

    it('defaults isConfirmed to false when absent', () => {
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.isConfirmed).toBe(false)
    })

    it('extracts dayNote', () => {
      const monthData = makeMonthData({ [date]: { windows: [], note: 'standup done' } })
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.dayNote).toBe('standup done')
    })

    it('returns null dayNote when absent', () => {
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.dayNote).toBeNull()
    })

    it('extracts autoCategoryOverride', () => {
      const monthData = makeMonthData({ [date]: { windows: [], autoCategoryOverride: '_COREMEDIA' } })
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.autoCategoryOverride).toBe('_COREMEDIA')
    })
  })

  describe('config defaults', () => {
    it('uses default weekdayHours when config is undefined — date is Thursday (2026-06-05)', () => {
      // 2026-06-05 is a Thursday, DEFAULT_WEEKDAY_HOURS[4] = 8
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.sollstunden).toBe(8)
    })

    it('uses weekdayHours from config for the given date', () => {
      // 2026-06-05 is Friday (JS weekday 5)
      const weekdayHours: [number, number, number, number, number, number, number] = [0, 6, 6, 6, 6, 7, 0]
      const config = { ...DEFAULT_APP_CONFIG, weekdayHours }
      const result = composeDayContext(date, makeMonthData(), config, today)
      expect(result.sollstunden).toBe(7) // Friday = index 5 = 7h
    })

    it('defaults effectiveLocation to Remote when no day location and no config default', () => {
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.effectiveLocation).toBe('Remote')
    })

    it('uses day location over config default', () => {
      const monthData = makeMonthData({ [date]: { windows: [], location: 'Office' } })
      const config = { ...DEFAULT_APP_CONFIG, defaultWorkLocation: 'Remote' as const }
      const result = composeDayContext(date, monthData, config, today)
      expect(result.effectiveLocation).toBe('Office')
    })

    it('uses config defaultWorkLocation when day has no location', () => {
      const config = { ...DEFAULT_APP_CONFIG, defaultWorkLocation: 'Office' as const }
      const result = composeDayContext(date, makeMonthData(), config, today)
      expect(result.effectiveLocation).toBe('Office')
    })

    it('resolves autoCategory from day override over global default', () => {
      const monthData = makeMonthData({ [date]: { windows: [], autoCategoryOverride: '_SUPPORT' } })
      const config = { ...DEFAULT_APP_CONFIG, autoCategory: '_COREMEDIA' }
      const result = composeDayContext(date, monthData, config, today)
      expect(result.autoCategory).toBe('_SUPPORT')
    })

    it('falls back to global autoCategory when no day override', () => {
      const config = { ...DEFAULT_APP_CONFIG, autoCategory: '_COREMEDIA' }
      const result = composeDayContext(date, makeMonthData(), config, today)
      expect(result.autoCategory).toBe('_COREMEDIA')
    })
  })

  describe('office stats', () => {
    it('returns zero office stats when no tracked work days', () => {
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.officeDays).toBe(0)
      expect(result.totalWorkDays).toBe(0)
      expect(result.officePercent).toBe(0)
    })

    it('counts office days from month data', () => {
      const window = { id: 'w1', start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }
      const monthData: MonthData = {
        '2026-06-02': { windows: [window], location: 'Office' },
        '2026-06-03': { windows: [window], location: 'Remote' },
      }
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.officeDays).toBe(1)
      expect(result.totalWorkDays).toBe(2)
      expect(result.officePercent).toBe(50)
    })
  })

  describe('computed stats', () => {
    it('returns workedHours from work periods', () => {
      const window = { id: 'w1', start: '09:00', end: '10:30', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.workedHours).toBeCloseTo(1.5)
    })

    it('returns manualTotal as sum of categorized hours', () => {
      const window = { id: 'w1', start: '09:00', end: '11:00', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const result = composeDayContext(date, monthData, undefined, today)
      expect(result.manualTotal).toBeCloseTo(2)
    })

    it('returns todayIso', () => {
      const result = composeDayContext(date, makeMonthData(), undefined, today)
      expect(result.todayIso).toBe(today)
    })
  })

  describe('planned-stop state', () => {
    it('is inactive when the viewed date is not today', () => {
      const window = { id: 'w1', start: '09:00', end: '18:00', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const result = composeDayContext(date, monthData, undefined, '2026-06-06', '14:00')
      expect(result.isPlannedStopMode).toBe(false)
      expect(result.plannedStopTime).toBeNull()
      expect(result.countdownHours).toBe(0)
      expect(result.projectedWorkedToday).toBeUndefined()
    })

    it('activates for a future-end period on today, projecting the full planned duration', () => {
      const window = { id: 'w1', start: '09:00', end: '18:00', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const result = composeDayContext(date, monthData, undefined, today, '14:00')
      expect(result.isPlannedStopMode).toBe(true)
      expect(result.plannedStopTime).toBe('18:00')
      expect(result.countdownHours).toBeCloseTo(4)
      expect(result.projectedWorkedToday).toBeCloseTo(9)
    })

    it('is inactive when today has no planned-stop period', () => {
      const window = { id: 'w1', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const result = composeDayContext(date, monthData, undefined, today, '14:00')
      expect(result.isPlannedStopMode).toBe(false)
      expect(result.plannedStopTime).toBeNull()
      expect(result.projectedWorkedToday).toBeUndefined()
    })

    it('respects remainingTimeReference: target-hours disables planned-stop mode', () => {
      const window = { id: 'w1', start: '09:00', end: '18:00', category: '_COREMEDIA', subtasks: [] }
      const monthData = makeMonthData({ [date]: { windows: [window] } })
      const config = { ...DEFAULT_APP_CONFIG, remainingTimeReference: 'target-hours' as const }
      const result = composeDayContext(date, monthData, config, today, '14:00')
      expect(result.isPlannedStopMode).toBe(false)
    })
  })
})
