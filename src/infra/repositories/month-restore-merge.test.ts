// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mergeRestoredDay, mergeRestoredMonth } from './month-restore-merge'
import type { WorkPeriod } from './types'

function period(overrides: Partial<WorkPeriod> = {}): WorkPeriod {
  return { id: 'p1', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [], ...overrides }
}

describe('mergeRestoredDay', () => {
  it('returns the trashed day when the current day is empty', () => {
    const trashed = { windows: [period()], location: 'Office' as const }
    expect(mergeRestoredDay({ windows: [] }, trashed)).toEqual(trashed)
  })

  it('keeps current periods and adds trashed periods that are not already present', () => {
    const current = { windows: [period({ id: 'c1' })] }
    const trashed = { windows: [period({ id: 't1' }), period({ id: 't2', start: '13:00', end: '17:00' })] }
    expect(mergeRestoredDay(current, trashed).windows).toEqual([
      period({ id: 'c1' }),
      period({ id: 't2', start: '13:00', end: '17:00' }),
    ])
  })

  it('treats periods with the same times but another category as distinct', () => {
    const current = { windows: [period({ id: 'c1' })] }
    const trashed = { windows: [period({ id: 't1', category: '_SUPPORT' })] }
    expect(mergeRestoredDay(current, trashed).windows).toHaveLength(2)
  })

  it('gives a restored period a new id when its id is already taken by a different current period', () => {
    const current = { windows: [period({ id: 'same' })] }
    const trashed = { windows: [period({ id: 'same', start: '13:00', end: '17:00' })] }
    const ids = mergeRestoredDay(current, trashed).windows.map((w) => w.id)
    expect(ids[0]).toBe('same')
    expect(ids[1]).not.toBe('same')
  })

  it('keeps current day fields and fills missing ones from the trashed day', () => {
    const current = { windows: [period()], note: 'current' }
    const trashed = { windows: [], note: 'trashed', location: 'Remote' as const }
    expect(mergeRestoredDay(current, trashed)).toMatchObject({ note: 'current', location: 'Remote' })
  })
})

describe('mergeRestoredMonth', () => {
  it('restores days only in trash and merges days present in both', () => {
    const current = { '2026-06-01': { windows: [period({ id: 'c1' })] } }
    const trashed = {
      '2026-06-01': { windows: [period({ id: 't1', start: '13:00', end: '14:00' })] },
      '2026-06-02': { windows: [period({ id: 't2' })] },
    }
    const merged = mergeRestoredMonth(current, trashed)
    expect(merged['2026-06-01']?.windows.map((w) => w.id)).toEqual(['c1', 't1'])
    expect(merged['2026-06-02']?.windows.map((w) => w.id)).toEqual(['t2'])
  })

  it('leaves days that are only current untouched', () => {
    const current = { '2026-06-03': { windows: [period()] } }
    expect(mergeRestoredMonth(current, {})).toEqual(current)
  })
})
