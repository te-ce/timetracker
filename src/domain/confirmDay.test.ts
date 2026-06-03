import { describe, it, expect } from 'vitest'
import { buildConfirmedDay } from './confirmDay'
import type { WorkPeriod, TimeEntry, Day } from '../repositories/types'

function win(start: string, end: string): WorkPeriod {
  return { id: 'w1', start, end }
}

function entry(id: string, category: string, hours: number): TimeEntry {
  return { id, category, hours }
}

function day(windows: WorkPeriod[] = [], entries: TimeEntry[] = []): Day {
  return { entries, windows }
}

describe('buildConfirmedDay', () => {
  it('marks the day as confirmed', () => {
    const result = buildConfirmedDay([win('08:00', '16:00')], [], null, null, day([win('08:00', '16:00')]))
    expect(result.confirmed).toBe(true)
  })

  it('does not add auto entry when no auto category is configured', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 3)],
      null,
      null,
      day([win('08:00', '16:00')], [entry('e1', 'QA', 3)]),
    )
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.category).toBe('QA')
  })

  it('adds auto-category entry for remaining hours', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 3)],
      null,
      '_COREMEDIA',
      day([win('08:00', '16:00')], [entry('e1', 'QA', 3)]),
    )
    expect(result.entries.find((e) => e.category === '_COREMEDIA')?.hours).toBe(5)
  })

  it('replaces existing auto-category entry on re-confirm instead of accumulating', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 3)],
      null,
      '_COREMEDIA',
      day([win('08:00', '16:00')], [entry('e1', 'QA', 3), entry('auto-1', '_COREMEDIA', 8)]),
    )
    const autoEntries = result.entries.filter((e) => e.category === '_COREMEDIA')
    expect(autoEntries).toHaveLength(1)
    expect(autoEntries[0]?.hours).toBe(5)
    expect(autoEntries[0]?.id).toBe('auto-1')
  })

  it('does not add auto entry when autoHours is 0 (fully booked)', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 8)],
      null,
      '_COREMEDIA',
      day([win('08:00', '16:00')], [entry('e1', 'QA', 8)]),
    )
    expect(result.entries.find((e) => e.category === '_COREMEDIA')).toBeUndefined()
  })

  it('uses per-day auto-category override over global default', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [],
      '_SUPPORT',
      '_COREMEDIA',
      day([win('08:00', '16:00')]),
    )
    expect(result.entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(8)
    expect(result.entries.find((e) => e.category === '_COREMEDIA')).toBeUndefined()
  })

  it('preserves existing non-auto entries after confirm', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 3), entry('e2', 'Support', 2)],
      null,
      '_COREMEDIA',
      day([win('08:00', '16:00')], [entry('e1', 'QA', 3), entry('e2', 'Support', 2)]),
    )
    expect(result.entries.find((e) => e.id === 'e1')).toBeDefined()
    expect(result.entries.find((e) => e.id === 'e2')).toBeDefined()
    expect(result.entries.find((e) => e.category === '_COREMEDIA')?.hours).toBe(3)
  })

  it('removes a stale auto entry when re-confirming a fully-booked day', () => {
    const result = buildConfirmedDay(
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 8)],
      null,
      '_COREMEDIA',
      day([win('08:00', '16:00')], [entry('e1', 'QA', 8), entry('auto-1', '_COREMEDIA', 2)]),
    )
    expect(result.entries.find((e) => e.category === '_COREMEDIA')).toBeUndefined()
  })
})
