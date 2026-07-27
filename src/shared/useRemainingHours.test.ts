import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { DayQueryResult } from '../features/day/useDayQuery'
import type { OvertimeToDate } from '../features/month'
import { DEFAULT_APP_CONFIG } from './appConfigDefaults'

vi.mock('../features/day/useDayQuery', () => ({
  useDayQuery: vi.fn(),
}))

vi.mock('./timeFormatStore', () => ({
  useTimeFormatStore: vi.fn(() => ({ format: 'decimal', toggleFormat: vi.fn() })),
}))

import { useDayQuery } from '../features/day/useDayQuery'
import { useTimeFormatStore } from './timeFormatStore'
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
    dayClassification: { displayStatus: 'untracked', reason: '' },
    officeDays: 0,
    totalWorkDays: 0,
    officePercent: 0,
    isPlannedStopMode: false,
    plannedStopTime: null,
    countdownHours: 0,
    projectedWorkedToday: undefined,
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
    it('sets title with remaining hours in decimal format when work remains', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 5 })
      renderHook(() => useRemainingHours())
      expect(document.title).toBe('(3.00h left) Timetracker')
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
      expect(document.title).toBe('(3.00h left) Timetracker')

      stubDayQuery({ sollstunden: 8, workedHours: 8 })
      act(() => {
        rerender()
      })
      expect(document.title).toBe('Timetracker')
    })

    it('sets title in HH:MM format when hhmm format is active', () => {
      vi.mocked(useTimeFormatStore).mockReturnValue({ format: 'hhmm', toggleFormat: vi.fn() })
      stubDayQuery({ sollstunden: 8, workedHours: 5 })
      renderHook(() => useRemainingHours())
      expect(document.title).toBe('(3:00 left) Timetracker')
      vi.mocked(useTimeFormatStore).mockReturnValue({ format: 'decimal', toggleFormat: vi.fn() })
    })
  })

  describe('live tracking', () => {
    it('subtracts live window elapsed from remaining', () => {
      const now = new Date()
      const thirtyMinsAgoHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(Math.max(0, now.getMinutes() - 30)).padStart(2, '0')}`
      // workedHours includes the live elapsed (buildDaySummary now passes `now` to calculateWorkedHours).
      // 3h closed + 0.5h live = 3.5h total from the query.
      stubDayQuery({
        sollstunden: 8,
        workedHours: 3.5,
        windows: [{ id: '1', start: thirtyMinsAgoHHMM, end: null, category: 'Work', subtasks: [] }],
      })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(4.5, 0)
    })

    it('does not double-count live elapsed when a period has been re-opened by deleting its stop time', () => {
      // Scenario: user had a period stopped at noon, then deleted the stop time.
      // The period is now open (end: null). buildDaySummary passes `now` so
      // workedHours from useDayQuery already contains the live elapsed (5h).
      // remaining must be sollstunden − workedHours (not − workedHours − liveElapsed).
      const now = new Date()
      const fiveHoursAgoHH = String((now.getHours() - 5 + 24) % 24).padStart(2, '0')
      const fiveHoursAgoHHMM = `${fiveHoursAgoHH}:${String(now.getMinutes()).padStart(2, '0')}`
      stubDayQuery({
        sollstunden: 8,
        workedHours: 5, // 5h live elapsed already in workedHours (from calculateWorkedHours with now)
        windows: [{ id: '1', start: fiveHoursAgoHHMM, end: null, category: 'Work', subtasks: [] }],
      })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(3, 0) // 8 − 5, not 8 − 5 − 5
    })

    it('remaining excludes live tracking when no open window', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(5)
    })

    it('refreshes currentNow immediately when live activity starts, avoiding stale-time wraparound', () => {
      vi.useFakeTimers()
      // Mount with no live activity; currentNow initialises to "08:31"
      vi.setSystemTime(new Date('2026-06-03T08:31:00'))
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [] })
      const { result, rerender } = renderHook(() => useRemainingHours())
      expect(result.current.liveElapsed).toBe(0)

      // Advance wall-clock 30 minutes WITHOUT ticking the interval (no live period → no interval)
      vi.setSystemTime(new Date('2026-06-03T09:01:00'))

      // Now a work period starts at 09:01
      stubDayQuery({
        sollstunden: 8,
        workedHours: 3,
        windows: [{ id: '1', start: '09:01', end: null, category: 'Work', subtasks: [] }],
      })
      act(() => {
        rerender()
      })

      // liveElapsed must be ~0 (just started), not a wrapped-around ~23.5h value
      expect(result.current.liveElapsed).toBeCloseTo(0, 1)
      vi.useRealTimers()
    })
  })
})

describe('buildReceipt', () => {
  it('includes target, carry-over, worked, and remaining lines', () => {
    const lines = buildReceipt(8, 1, 3, 0, 4, 'decimal')
    expect(lines.find((l) => l.label === 'Target')?.value).toBe('8.00h')
    expect(lines.find((l) => l.label.includes('carry'))?.value).toContain('1')
    expect(lines.find((l) => l.label === 'Worked')?.value).toContain('3')
    const total = lines.find((l) => l.isTotal)
    expect(total?.label).toBe('Remaining')
    expect(total?.value).toContain('4')
  })

  it('shows overtime when remaining is negative', () => {
    const lines = buildReceipt(8, 0, 10, 0, -2, 'decimal')
    const total = lines.find((l) => l.isTotal)
    expect(total?.label).toBe('Overtime')
    expect(total?.value).toContain('2.00')
  })

  it('shows Done when remaining is exactly 0', () => {
    const lines = buildReceipt(8, 0, 8, 0, 0, 'decimal')
    const total = lines.find((l) => l.isTotal)
    expect(total?.label).toBe('Done')
  })

  it('includes current window line when liveElapsed > 0', () => {
    const lines = buildReceipt(8, 0, 3, 0.5, 4.5, 'decimal')
    expect(lines.some((l) => l.label === 'Current')).toBe(true)
  })

  it('omits current window line when liveElapsed is 0', () => {
    const lines = buildReceipt(8, 0, 3, 0, 5, 'decimal')
    expect(lines.some((l) => l.label === 'Current')).toBe(false)
  })

  it('shows Required as primary line with value = target minus carry-over', () => {
    // sollstunden=8, priorOvertime=2 → required=6
    const lines = buildReceipt(8, 2, 0, 0, 6, 'decimal')
    expect(lines.find((l) => l.label === 'Required')?.value).toBe('6.00h')
  })

  it('marks Target and carry-over as sub-items of Required', () => {
    const lines = buildReceipt(8, 2, 0, 0, 6, 'decimal')
    expect(lines.find((l) => l.label === 'Target')?.isSubItem).toBe(true)
    expect(lines.find((l) => l.label.includes('carry'))?.isSubItem).toBe(true)
  })

  it('shows Worked as primary line with totalWorked value (past + live)', () => {
    // totalWorked = 3 + 0.5 = 3.5
    const lines = buildReceipt(8, 0, 3, 0.5, 4.5, 'decimal')
    expect(lines.find((l) => l.label === 'Worked')?.value).toContain('3.50')
  })

  it('shows Past as isSubItem with workedHours value', () => {
    const lines = buildReceipt(8, 0, 3, 0, 5, 'decimal')
    const pastLine = lines.find((l) => l.label === 'Past')
    expect(pastLine?.isSubItem).toBe(true)
    expect(pastLine?.value).toContain('3')
  })

  it('marks Current as isSubItem', () => {
    const lines = buildReceipt(8, 0, 3, 0.5, 4.5, 'decimal')
    expect(lines.find((l) => l.label === 'Current')?.isSubItem).toBe(true)
  })
})

// ─── Helpers for planned-stop tests ─────────────────────────────────────────

function hhmmFromNow(offsetMinutes: number): string {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function makePlannedStopWindow(startOffsetMins: number, endOffsetMins: number) {
  return {
    id: 'ps-1',
    start: hhmmFromNow(startOffsetMins),
    end: hhmmFromNow(endOffsetMins),
    category: 'Work',
    subtasks: [],
  }
}

describe('useRemainingHours — Planned-Stop WorkPeriod', () => {
  describe('planned-stop mode (default when plannedStopPeriod exists)', () => {
    it('returns countdown to planned stop as remaining', () => {
      // Start 2h ago, end 1h from now → countdown = ~1h
      const ps = makePlannedStopWindow(-120, 60)
      const fullDuration = 3 // 2h worked + 1h remaining = 3h total
      stubDayQuery({ sollstunden: 8, workedHours: fullDuration, windows: [ps] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(1, 0)
    })

    it('remaining is positive (countdown) even when projected overtime', () => {
      // Start 9h ago, end 1h from now → planned = 10h total, target = 8h → projected OT
      // Countdown should still show 1h
      const ps = makePlannedStopWindow(-540, 60)
      stubDayQuery({ sollstunden: 8, workedHours: 10, windows: [ps] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(1, 0)
    })

    it('sets isPlannedStopMode to true when planned stop is active', () => {
      const ps = makePlannedStopWindow(-60, 60)
      stubDayQuery({ sollstunden: 8, workedHours: 2, windows: [ps] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.isPlannedStopMode).toBe(true)
    })

    it('exposes plannedStopTime as the end HH:MM string', () => {
      const ps = makePlannedStopWindow(-60, 60)
      stubDayQuery({ sollstunden: 8, workedHours: 2, windows: [ps] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.plannedStopTime).toBe(ps.end)
    })

    it('exposes projectedRemaining based on full planned duration', () => {
      // Start 2h ago, end 2h from now → full planned = 4h, target = 8h → projected remaining = 4h
      const ps = makePlannedStopWindow(-120, 120)
      stubDayQuery({ sollstunden: 8, workedHours: 4, windows: [ps] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.projectedRemaining).toBeCloseTo(4, 0)
    })

    it('shows projected overtime in projectedRemaining when planned > target', () => {
      // Start 7h ago, end 2h from now → full planned = 9h, target = 8h → projected = -1h (OT)
      const ps = makePlannedStopWindow(-420, 120)
      stubDayQuery({ sollstunden: 8, workedHours: 9, windows: [ps] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.projectedRemaining).toBeCloseTo(-1, 0)
    })

    it('sets tab title to countdown when planned stop is active', () => {
      const ps = makePlannedStopWindow(-120, 60)
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [ps] })
      renderHook(() => useRemainingHours())
      expect(document.title).toMatch(/left.*Timetracker/)
    })
  })

  describe('target-hours mode (when remainingTimeReference = target-hours)', () => {
    it('projects the full planned-stop duration into remaining when countdown is off', () => {
      const ps = makePlannedStopWindow(-120, 60)
      // Planned stop runs -120..+60 → full planned duration = 3h. With the countdown off,
      // remaining should use the projected total (3h), not just live-elapsed (2h):
      // Remaining = 8 − 3 = 5h.
      stubDayQuery({
        sollstunden: 8,
        workedHours: 2, // planned live elapsed (not full planned duration)
        windows: [ps],
        config: { ...DEFAULT_APP_CONFIG, remainingTimeReference: 'target-hours' },
      })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(5, 0)
    })

    it('sets isPlannedStopMode to false when remainingTimeReference is target-hours', () => {
      const ps = makePlannedStopWindow(-60, 60)
      stubDayQuery({
        sollstunden: 8,
        workedHours: 2,
        windows: [ps],
        config: { ...DEFAULT_APP_CONFIG, remainingTimeReference: 'target-hours' },
      })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.isPlannedStopMode).toBe(false)
    })
  })

  describe('no planned stop', () => {
    it('isPlannedStopMode is false when no period has a future end', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.isPlannedStopMode).toBe(false)
    })

    it('plannedStopTime is null when no planned stop', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.plannedStopTime).toBeNull()
    })

    it('remaining uses target-based formula when no planned stop', () => {
      stubDayQuery({ sollstunden: 8, workedHours: 3, windows: [] })
      const { result } = renderHook(() => useRemainingHours())
      expect(result.current.remaining).toBeCloseTo(5)
    })

    it('does not treat a just-closed period as planned-stop even when its end equals the current minute', () => {
      // Simulate the bug: a work period closed with end = "now" (current minute).
      // A stale `currentNow` tick could see this period as a planned stop for up
      // to 59 seconds. The fix uses nowHHMMFn() directly for detection.
      const justClosed = makePlannedStopWindow(-60, 0) // end is exactly now (offset = 0 min)
      stubDayQuery({ sollstunden: 8, workedHours: 1, windows: [justClosed] })
      const { result } = renderHook(() => useRemainingHours())
      // end == now is NOT in the future, so isPlannedStopMode must be false
      expect(result.current.isPlannedStopMode).toBe(false)
    })
  })
})
