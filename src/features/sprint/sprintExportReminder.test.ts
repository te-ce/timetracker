import { describe, it, expect } from 'vitest'
import {
  getSprintsNeedingExport,
  sprintExportBadgeLabel,
  sprintExportTooltipText,
  shouldNotifyToday,
  getSprintBadgeState,
  sprintCountdownLabel,
} from './sprintExportReminder'
import type { SprintConfig } from './sprint'

const config: SprintConfig = { startDate: '2026-01-01', lengthDays: 14 }
// Sprint 0: 2026-01-01 → 2026-01-14
// Sprint 1: 2026-01-15 → 2026-01-28

describe('getSprintsNeedingExport', () => {
  it('includes sprint on its last day with hours and pending status', () => {
    const sprints = getSprintsNeedingExport('2026-01-14', config, [
      { index: 0, totalHours: 40, exportStatus: 'pending' },
    ])
    expect(sprints).toHaveLength(1)
    expect(sprints[0]?.index).toBe(0)
  })

  it('excludes sprint whose last day has not started yet', () => {
    const sprints = getSprintsNeedingExport('2026-01-13', config, [
      { index: 0, totalHours: 40, exportStatus: 'pending' },
    ])
    expect(sprints).toHaveLength(0)
  })

  it('excludes sprint with zero hours', () => {
    const sprints = getSprintsNeedingExport('2026-01-14', config, [
      { index: 0, totalHours: 0, exportStatus: 'pending' },
    ])
    expect(sprints).toHaveLength(0)
  })

  it('excludes already exported sprint', () => {
    const sprints = getSprintsNeedingExport('2026-01-14', config, [
      { index: 0, totalHours: 40, exportStatus: 'exported' },
    ])
    expect(sprints).toHaveLength(0)
  })

  it('returns multiple qualifying sprints sorted by index', () => {
    // today is in sprint 2 (2026-01-29..2026-02-11), last day of sprint 1 = 2026-01-28
    const sprints = getSprintsNeedingExport('2026-01-28', config, [
      { index: 1, totalHours: 35, exportStatus: 'pending' },
      { index: 0, totalHours: 40, exportStatus: 'pending' },
    ])
    expect(sprints.map((s) => s.index)).toEqual([0, 1])
  })

  it('includes sprint exactly 6 back from current sprint', () => {
    // Sprint 6 starts 2026-03-26, ends 2026-04-08; sprint 0 is exactly 6 back → included
    const todayInSprint6 = '2026-04-08'
    const sprints = getSprintsNeedingExport(todayInSprint6, config, [
      { index: 0, totalHours: 40, exportStatus: 'pending' },
    ])
    expect(sprints).toHaveLength(1)
  })

  it('excludes sprints more than 6 back from current sprint', () => {
    // Sprint 7 starts 2026-01-01 + 98 days = 2026-04-09; sprint 0 is 7 back → excluded
    const todayInSprint7 = '2026-04-12'
    const sprints = getSprintsNeedingExport(todayInSprint7, config, [
      { index: 0, totalHours: 40, exportStatus: 'pending' },
    ])
    expect(sprints).toHaveLength(0)
  })
})

const sprint = (index: number) => ({ index, start: '2026-01-01', end: '2026-01-14' })

describe('sprintExportBadgeLabel', () => {
  it('single sprint shows index', () => {
    expect(sprintExportBadgeLabel([sprint(4)])).toBe('Export Sprint 5')
  })

  it('multiple sprints shows plural without index', () => {
    expect(sprintExportBadgeLabel([sprint(4), sprint(5)])).toBe('Export Sprints')
  })
})

describe('sprintExportTooltipText', () => {
  it('single sprint returns null', () => {
    expect(sprintExportTooltipText([sprint(4)])).toBeNull()
  })

  it('multiple sprints returns comma-separated indices', () => {
    expect(sprintExportTooltipText([sprint(4), sprint(5), sprint(6)])).toBe('Sprint 5, 6, 7')
  })
})

describe('shouldNotifyToday', () => {
  it('returns true when no prior notification stored', () => {
    expect(shouldNotifyToday('2026-06-25', [4], null)).toBe(true)
  })

  it('returns false when already notified today for same indices', () => {
    const stored = JSON.stringify({ date: '2026-06-25', indices: [4] })
    expect(shouldNotifyToday('2026-06-25', [4], stored)).toBe(false)
  })

  it('returns true when notified today but for different indices', () => {
    const stored = JSON.stringify({ date: '2026-06-25', indices: [3] })
    expect(shouldNotifyToday('2026-06-25', [4], stored)).toBe(true)
  })

  it('returns true when notified on a previous day', () => {
    const stored = JSON.stringify({ date: '2026-06-24', indices: [4] })
    expect(shouldNotifyToday('2026-06-25', [4], stored)).toBe(true)
  })
})

describe('getSprintBadgeState', () => {
  it('prioritizes export over countdown when a sprint needs export', () => {
    const state = getSprintBadgeState('2026-01-14', config, [{ index: 0, totalHours: 40, exportStatus: 'pending' }])
    expect(state).toEqual({ kind: 'export', sprints: [{ index: 0, start: '2026-01-01', end: '2026-01-14' }] })
  })

  it('falls back to countdown when nothing needs export', () => {
    const state = getSprintBadgeState('2026-01-01', config, [])
    expect(state).toEqual({ kind: 'countdown', daysLeft: 13 })
  })

  it('countdown reaches zero on the sprint last day', () => {
    const state = getSprintBadgeState('2026-01-14', config, [{ index: 0, totalHours: 0, exportStatus: 'pending' }])
    expect(state).toEqual({ kind: 'countdown', daysLeft: 0 })
  })
})

describe('sprintCountdownLabel', () => {
  it('shows "ends today" at zero days left', () => {
    expect(sprintCountdownLabel(0)).toBe('Sprint ends today')
  })

  it('singular phrasing for one day left', () => {
    expect(sprintCountdownLabel(1)).toBe('1 day left in sprint')
  })

  it('plural phrasing for multiple days left', () => {
    expect(sprintCountdownLabel(5)).toBe('5 days left in sprint')
  })
})
