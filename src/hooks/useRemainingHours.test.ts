import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { DayQueryResult } from './useDayQuery'
import type { OvertimeToDate } from '../domain/monthStats'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'

vi.mock('./useDayQuery', () => ({
  useDayQuery: vi.fn(),
}))

import { useDayQuery } from './useDayQuery'
import { useRemainingHours } from './useRemainingHours'

function makeOvertimeToDate(priorOvertime = 0): OvertimeToDate {
  return { value: priorOvertime, workedToday: 0, priorOvertime }
}

function stubDayQuery(overrides: Partial<DayQueryResult>): void {
  vi.mocked(useDayQuery).mockReturnValue({
    config: DEFAULT_APP_CONFIG,
    windows: [],
    workLocation: null,
    autoCategoryOverride: null,
    dayTypeOverride: undefined,
    isConfirmed: false,
    dayNote: null,
    sollstunden: 8,
    defaultWorkLocation: 'Remote',
    effectiveLocation: 'Remote',
    autoCategory: null,
    workedHours: 0,
    manualTotal: 0,
    overtimeToDate: makeOvertimeToDate(),
    selectedDayType: 'WorkDay',
    isEntriesBalanced: false,
    hasAutoCategory: false,
    dayClassification: { displayStatus: 'untracked', reason: '' },
    todayIso: '2026-06-03',
    ...overrides,
  })
}

afterEach(() => {
  document.title = 'Timetracker'
})

describe('useRemainingHours', () => {
  describe('remaining calculation', () => {
    it('returns sollstunden minus workedHours', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(5)
    })

    it('clamps remaining to 0 when workedHours exceeds sollstunden', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 9 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBe(0)
    })

    it('returns 0 remaining when exactly at sollstunden', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 8 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBe(0)
    })
  })

  describe('pass-through values', () => {
    it('returns sollstunden from the query', () => {
      stubDayQuery({ sollstunden: 6 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.sollstunden).toBe(6)
    })

    it('returns workedHours from the query', () => {
      stubDayQuery({ workedHours: 4.5 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.workedHours).toBeCloseTo(4.5)
    })

    it('returns priorOvertime from overtimeToDate', () => {
      stubDayQuery({ overtimeToDate: makeOvertimeToDate(2.5) })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.priorOvertime).toBeCloseTo(2.5)
    })
  })

  describe('document.title side effect', () => {
    it('sets title with remaining hours when work remains', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 5 })
      renderHook(() => useRemainingHours())
      expect(document.title).toBe('(3.0h left) Timetracker')
    })

    it('sets title to plain "Timetracker" when goal is reached', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 8 })
      renderHook(() => useRemainingHours())
      expect(document.title).toBe('Timetracker')
    })

    it('updates title when remaining changes', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 5 })
      const { rerender } = renderHook(() => useRemainingHours())
      expect(document.title).toBe('(3.0h left) Timetracker')

      stubDayQuery({ sollstunden: 8, workedHours: 8 })
      act(() => {
        rerender()
      })
      expect(document.title).toBe('Timetracker')
    })
  })
})
