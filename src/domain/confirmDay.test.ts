import { describe, it, expect } from 'vitest'
import { confirmDay } from './confirmDay'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import type { WorkPeriod, TimeEntry } from '../repositories/types'

function win(start: string, end: string): WorkPeriod {
  return { id: 'w1', start, end }
}

function entry(id: string, category: string, hours: number): TimeEntry {
  return { id, category, hours }
}

async function getDay(repo: InMemoryMonthRepository, date: string) {
  const [year, month] = date.split('-').map(Number)
  const data = await repo.getMonth(year!, month!)
  return data[date]
}

describe('confirmDay', () => {
  it('marks the day as confirmed', async () => {
    const repo = new InMemoryMonthRepository()
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [], null, null, repo)
    expect((await getDay(repo, '2026-05-19'))?.confirmed).toBe(true)
  })

  it('does not add auto entry when no auto category is configured', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [entry('e1', 'QA', 3)],
      windows: [win('08:00', '16:00')],
    }))
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [entry('e1', 'QA', 3)], null, null, repo)
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    expect(stored).toHaveLength(1)
    expect(stored[0]?.category).toBe('QA')
  })

  it('adds auto-category entry for remaining hours', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [entry('e1', 'QA', 3)],
      windows: [win('08:00', '16:00')],
    }))
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [entry('e1', 'QA', 3)], null, '_COREMEDIA', repo)
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    const auto = stored.find((e) => e.category === '_COREMEDIA')
    expect(auto?.hours).toBe(5)
  })

  it('replaces existing auto-category entry on re-confirm instead of accumulating', async () => {
    const repo = new InMemoryMonthRepository()
    // Day already has a confirmed auto entry from a previous confirm
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [entry('e1', 'QA', 3), entry('auto-1', '_COREMEDIA', 8)],
      windows: [win('08:00', '16:00')],
    }))
    // Caller passes only manual entries (not the existing auto entry) for autoHours calc
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [entry('e1', 'QA', 3)], null, '_COREMEDIA', repo)
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    const autoEntries = stored.filter((e) => e.category === '_COREMEDIA')
    expect(autoEntries).toHaveLength(1)
    expect(autoEntries[0]?.hours).toBe(5) // replaced, not 8 + 5 = 13
    expect(autoEntries[0]?.id).toBe('auto-1') // preserves existing id
  })

  it('does not add auto entry when autoHours is 0 (fully booked)', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [entry('e1', 'QA', 8)],
      windows: [win('08:00', '16:00')],
    }))
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [entry('e1', 'QA', 8)], null, '_COREMEDIA', repo)
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    expect(stored.find((e) => e.category === '_COREMEDIA')).toBeUndefined()
  })

  it('uses per-day auto-category override over global default', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [],
      windows: [win('08:00', '16:00')],
    }))
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [], '_SUPPORT', '_COREMEDIA', repo)
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    expect(stored.find((e) => e.category === '_SUPPORT')?.hours).toBe(8)
    expect(stored.find((e) => e.category === '_COREMEDIA')).toBeUndefined()
  })

  it('preserves existing non-auto entries after confirm', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [entry('e1', 'QA', 3), entry('e2', 'Support', 2)],
      windows: [win('08:00', '16:00')],
    }))
    await confirmDay(
      '2026-05-19',
      [win('08:00', '16:00')],
      [entry('e1', 'QA', 3), entry('e2', 'Support', 2)],
      null,
      '_COREMEDIA',
      repo,
    )
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    expect(stored.find((e) => e.id === 'e1')).toBeDefined()
    expect(stored.find((e) => e.id === 'e2')).toBeDefined()
    expect(stored.find((e) => e.category === '_COREMEDIA')?.hours).toBe(3)
  })

  it('removes a stale auto entry when re-confirming a fully-booked day', async () => {
    const repo = new InMemoryMonthRepository()
    // Previously confirmed with auto entry, now manually filled the full 8h
    await repo.updateDay('2026-05-19', (day) => ({
      ...day,
      entries: [entry('e1', 'QA', 8), entry('auto-1', '_COREMEDIA', 2)],
      windows: [win('08:00', '16:00')],
    }))
    // Manual total is now 8h (auto entry NOT counted)
    await confirmDay('2026-05-19', [win('08:00', '16:00')], [entry('e1', 'QA', 8)], null, '_COREMEDIA', repo)
    const stored = (await getDay(repo, '2026-05-19'))!.entries
    expect(stored.find((e) => e.category === '_COREMEDIA')).toBeUndefined()
  })
})
