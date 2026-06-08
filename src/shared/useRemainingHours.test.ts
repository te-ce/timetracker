import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { DayQueryResult } from '../features/day/useDayQuery'
import type { OvertimeToDate } from '../features/month'
import { DEFAULT_APP_CONFIG } from './appConfigDefaults'

vi.mock('../features/day/useDayQuery', () => ({
  useDayQuery: vi.fn(),
}))

vi.mock('./useActiveTracking', () => ({
  useActiveTracking: vi.fn(() => null),
}))

import { useDayQuery } from '../features/day/useDayQuery'
import { useActiveTracking } from './useActiveTracking'
import { useRemainingHours, buildReceipt } from './useRemainingHours'

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
    officeDays: 0,
    totalWorkDays: 0,
    officePercent: 0,
    todayIso: '2026-06-03',
    ...overrides,
  })
}

afterEach(() => {
  document.title = 'Timetracker'
})

describe('useRemainingHours', () => {
  describe('remaining calculation', () => {
    it('returns sollstunden minus workedHours when no priorOvertime', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(5)
    })

    it('subtracts priorOvertime from remaining', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, overtimeToDate: makeOvertimeToDate(1) })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(4)
    })

    it('returns negative remaining when overtime (no clamping)', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 9 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(-1)
    })

    it('returns 0 remaining when exactly at sollstunden', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 8 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBe(0)
    })

    it('negative priorOvertime (undertime carry-over) increases remaining', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, overtimeToDate: makeOvertimeToDate(-1) })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(6)
    })
  })

  describe('summary string', () => {
    it('returns summary with target, carry-over and worked', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, overtimeToDate: makeOvertimeToDate(1) })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.summary).toMatch(/8/)
      expect(result.current.summary).toMatch(/overtime carry-over/)
      expect(result.current.summary).toMatch(/worked today/)
      expect(result.current.summary).toMatch(/remaining/)
    })

    it('shows overtime today when remaining is negative', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 10 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.summary).toMatch(/overtime today/)
    })

    it('shows Done when remaining is 0', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 8 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.summary).toMatch(/Done/)
    })
  })

  describe('office stats pass-through', () => {
    it('returns officeDays from the query', () => {
      stubDayQuery({ officeDays: 12 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.officeDays).toBe(12)
    })

    it('returns totalWorkDays from the query', () => {
      stubDayQuery({ totalWorkDays: 20 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.totalWorkDays).toBe(20)
    })

    it('returns officePercent from the query', () => {
      stubDayQuery({ officePercent: 65 })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.officePercent).toBe(65)
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

    it('sets title to plain "Timetracker" when overtime', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 9 })
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

  describe('live tracking', () => {
    it('subtracts active tracking elapsed from remaining', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3 })
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      vi.mocked(useActiveTracking).mockReturnValue({ startedAt: oneHourAgo, category: 'Work', date: '2026-06-08' })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(4, 0)
    })

    it('subtracts live window elapsed from remaining', () => {
      const now = new Date()
      const thirtyMinsAgoHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(Math.max(0, now.getMinutes() - 30)).padStart(2, '0')}`
      stubDayQuery({
        sollstunden: 8,
        workedHours: 3,
        windows: [{ id: '1', start: thirtyMinsAgoHHMM, end: null, category: 'Work', subtasks: [] }],
      })
      vi.mocked(useActiveTracking).mockReturnValue(null)
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(4.5, 0)
    })

    it('remaining excludes live tracking when no tracking active', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [] })
      vi.mocked(useActiveTracking).mockReturnValue(null)
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(5)
    })
  })
})

describe('buildReceipt', () => {
  it('includes target, carry-over, worked, and remaining lines', () => {
    const lines = buildReceipt(8, 1, 3, 0, 0, 'decimal')
    expect(lines.find((l) => l.label === 'Target')?.value).toBe('8.00h')
    expect(lines.find((l) => l.label.includes('carry'))?.value).toContain('1')
    expect(lines.find((l) => l.label === 'Worked today')?.value).toContain('3')
    const total = lines.find((l) => l.isTotal)
    expect(total?.label).toBe('Remaining')
    expect(total?.value).toContain('4')
  })

  it('shows overtime when remaining is negative', () => {
    const lines = buildReceipt(8, 0, 10, 0, 0, 'decimal')
    const total = lines.find((l) => l.isTotal)
    expect(total?.label).toBe('Overtime')
    expect(total?.value).toContain('2.00')
  })

  it('shows Done when remaining is exactly 0', () => {
    const lines = buildReceipt(8, 0, 8, 0, 0, 'decimal')
    const total = lines.find((l) => l.isTotal)
    expect(total?.label).toBe('Done')
  })

  it('includes tracking line when trackingElapsed > 0', () => {
    const lines = buildReceipt(8, 0, 3, 1, 0, 'decimal')
    expect(lines.some((l) => l.label === 'Tracking')).toBe(true)
  })

  it('omits tracking line when trackingElapsed is 0', () => {
    const lines = buildReceipt(8, 0, 3, 0, 0, 'decimal')
    expect(lines.some((l) => l.label === 'Tracking')).toBe(false)
  })

  it('includes current window line when liveElapsed > 0', () => {
    const lines = buildReceipt(8, 0, 3, 0, 0.5, 'decimal')
    expect(lines.some((l) => l.label === 'Current tracking')).toBe(true)
  })

  it('omits current window line when liveElapsed is 0', () => {
    const lines = buildReceipt(8, 0, 3, 0, 0, 'decimal')
    expect(lines.some((l) => l.label === 'Current tracking')).toBe(false)
  })
})
