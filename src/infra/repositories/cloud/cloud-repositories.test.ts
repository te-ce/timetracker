// @vitest-environment node
import type { AppConfig } from '../types'
import type { StorageAdapter } from '../../storage/adapter'
import { InMemoryStorageAdapter } from '../../storage/in-memory-adapter'
import { CloudConfigRepository } from './config-repository'
import { CloudSprintExportRepository } from './sprint-export-repository'
import { CloudMonthRepository } from './month-repository'
import { DEFAULT_APP_CONFIG } from '../../../shared/appConfigDefaults'
import { DEFAULT_WEEKDAY_HOURS, type WeekdayHours } from '../../../shared/weekdayHours'

function adapterWithValue(key: string, value: unknown): StorageAdapter {
  return {
    get<T>(k: string): Promise<T | null> {
      if (k === key) return Promise.resolve(value as T | null)
      return Promise.resolve(null)
    },
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  }
}

describe('CloudConfigRepository', () => {
  it('update applies concurrent patches of different fields to the latest stored config', async () => {
    const repo = new CloudConfigRepository(new InMemoryStorageAdapter())
    await Promise.all([
      repo.update((c) => {
        const weekdayHours: WeekdayHours = [...c.weekdayHours]
        weekdayHours[1] = 7
        return { weekdayHours }
      }),
      repo.update(() => ({ autoCategory: 'Dev' })),
      repo.update((c) => ({ sprintLengthDays: c.sprintLengthDays + 1 })),
    ])
    const config = await repo.get()
    expect(config.weekdayHours[1]).toBe(7)
    expect(config.autoCategory).toBe('Dev')
    expect(config.sprintLengthDays).toBe(DEFAULT_APP_CONFIG.sprintLengthDays + 1)
  })

  it('returns defaults when no data stored', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    const config = await repo.get()
    expect(config.weekdayHours).toEqual([0, 8, 8, 8, 8, 8, 0])
    expect(config.customCategories).toEqual([])
  })

  it('returned config is isolated — mutating it does not corrupt cached state', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    await repo.save({
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
      customCategories: ['A'],
      categoryMapping: { A: 'mapped-A' },
    })

    const first = await repo.get()
    first.customCategories.push('mutated')
    first.categoryMapping!['injected'] = 'bad'

    const second = await repo.get()
    expect(second.customCategories).toEqual(['A'])
    expect(second.categoryMapping).toEqual({ A: 'mapped-A' })
  })

  it('save is isolated — mutating config after save does not corrupt stored state', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    const categoryMapping: Record<string, string> = { A: 'original' }
    const config: AppConfig = {
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
      customCategories: ['A'],
      categoryMapping,
    }
    await repo.save(config)

    config.customCategories.push('mutated')
    categoryMapping['injected'] = 'bad'

    const stored = await repo.get()
    expect(stored.customCategories).toEqual(['A'])
    expect(stored.categoryMapping).toEqual({ A: 'original' })
  })

  it('falls back to defaults and warns when stored config fails schema validation', async () => {
    const adapter = adapterWithValue('config.json', { sollstunden: 'not-a-number' })
    const repo = new CloudConfigRepository(adapter)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = await repo.get()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('stored value failed validation'), expect.anything())
    expect(config.weekdayHours).toEqual([0, 8, 8, 8, 8, 8, 0])
    warnSpy.mockRestore()
  })

  it('migrates old sollstunden to weekdayHours on load', async () => {
    const adapter = adapterWithValue('config.json', {
      sollstunden: 7,
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
    })
    const repo = new CloudConfigRepository(adapter)
    const config = await repo.get()
    expect(config.weekdayHours).toEqual([0, 7, 7, 7, 7, 7, 0])
  })

  it('persists and retrieves config', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    await repo.save({
      weekdayHours: [0, 7, 7, 7, 7, 7, 0],
      autoCategory: 'QA',
      federalState: 'HH',
      sprintLengthDays: 10,
      sprintStartDate: '2024-01-01',
      customCategories: ['Custom1'],
    })
    const repo2 = new CloudConfigRepository(adapter)
    const config = await repo2.get()
    expect(config.weekdayHours).toEqual([0, 7, 7, 7, 7, 7, 0])
    expect(config.autoCategory).toBe('QA')
    expect(config.customCategories).toEqual(['Custom1'])
  })
})

/** Every PUT takes a while, so overlapping repository calls interleave. */
class SlowAdapter extends InMemoryStorageAdapter {
  override async put<T>(key: string, data: T): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5))
    await super.put(key, data)
  }
}

describe('CloudMonthRepository', () => {
  it('keeps both changes when two updates to the same day overlap', async () => {
    const adapter = new SlowAdapter()
    const repo = new CloudMonthRepository(adapter)
    await Promise.all([
      repo.updateDay('2026-05-15', (day) => ({ ...day, note: 'note' })),
      repo.updateDay('2026-05-15', (day) => ({ ...day, location: 'Office' })),
    ])
    const fresh = new CloudMonthRepository(adapter)
    expect((await fresh.getMonth(2026, 5))['2026-05-15']).toMatchObject({ note: 'note', location: 'Office' })
  })

  // A synced folder (OneDrive client) has no conflict detection: another device's
  // file lands behind this device's cache.
  it('keeps a day another device wrote to a synced folder when this device writes another day', async () => {
    const folder = new InMemoryStorageAdapter()
    const thisDevice = new CloudMonthRepository(folder)
    const otherDevice = new CloudMonthRepository(folder)
    await thisDevice.updateDay('2026-10-27', (day) => ({ ...day, note: 'mine' }))
    await otherDevice.updateDay('2026-10-26', (day) => ({ ...day, note: 'theirs' }))

    await thisDevice.updateDay('2026-10-28', (day) => ({ ...day, note: 'mine later' }))

    const month = await new CloudMonthRepository(folder).getMonth(2026, 10)
    expect(month['2026-10-26']?.note).toBe('theirs')
  })

  it('keeps a month another device added to the synced folder index', async () => {
    const folder = new InMemoryStorageAdapter()
    const thisDevice = new CloudMonthRepository(folder)
    const otherDevice = new CloudMonthRepository(folder)
    await thisDevice.updateDay('2026-10-27', (day) => ({ ...day, note: 'mine' }))
    await otherDevice.updateDay('2026-11-02', (day) => ({ ...day, note: 'theirs' }))

    await thisDevice.updateDay('2026-10-28', (day) => ({ ...day, note: 'mine later' }))

    expect(await new CloudMonthRepository(folder).getAllMonths()).toEqual(['2026-10', '2026-11'])
  })

  it('returns empty object for month with no data', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    const data = await repo.getMonth(2026, 5)
    expect(data).toEqual({})
  })

  it('updateDay writes and retrieves day data', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', (day) => ({
      ...day,
      windows: [{ id: 'w1', start: '09:00', end: '15:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    const data = await repo.getMonth(2026, 5)
    expect(data['2026-05-15']?.windows).toHaveLength(1)
    expect(data['2026-05-15']?.windows[0]?.category).toBe('_COREMEDIA')
  })

  it('updateDay removes day when empty', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', (day) => ({
      ...day,
      windows: [{ id: 'w1', start: '09:00', end: '15:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    await repo.updateDay('2026-05-15', (day) => ({ ...day, windows: [] }))
    const data = await repo.getMonth(2026, 5)
    expect(data['2026-05-15']).toBeUndefined()
  })

  it('deleteMonth removes all data for month', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', () => ({
      windows: [{ id: 'w1', start: '09:00', end: '15:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    await repo.deleteMonth(2026, 5)
    const data = await repo.getMonth(2026, 5)
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('getAllMonths returns months that have data', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', () => ({
      windows: [{ id: 'w1', start: '09:00', end: '15:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    await repo.updateDay('2026-06-01', () => ({
      windows: [{ id: 'w2', start: '09:00', end: '13:00', category: '_SUPPORT', subtasks: [] }],
    }))
    const months = await repo.getAllMonths()
    expect(months).toContain('2026-05')
    expect(months).toContain('2026-06')
  })

  it('findEntriesByDateRange returns dated entries derived from periods', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', () => ({
      windows: [{ id: 'w1', start: '09:00', end: '15:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    await repo.updateDay('2026-06-01', () => ({
      windows: [{ id: 'w2', start: '09:00', end: '13:00', category: '_SUPPORT', subtasks: [] }],
    }))
    const results = await repo.findEntriesByDateRange('2026-05-01', '2026-06-30', DEFAULT_WEEKDAY_HOURS)
    expect(results).toHaveLength(2)
    const e1 = results.find((e) => e.category === '_COREMEDIA')
    expect(e1?.date).toBe('2026-05-15')
    expect(e1?.hours).toBe(6)
  })

  it('findEntriesByDateRange auto-books _LEAVE for a leave day with no logged work', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    // 2026-05-15 is a Friday (default target 8h)
    await repo.updateDay('2026-05-15', () => ({ windows: [], dayTypeOverride: 'Vacation' }))
    const results = await repo.findEntriesByDateRange('2026-05-01', '2026-05-31', DEFAULT_WEEKDAY_HOURS)
    expect(results).toEqual([{ id: '2026-05-15-_LEAVE', category: '_LEAVE', hours: 8, date: '2026-05-15' }])
  })

  it('findEntriesByDateRange filters by date bounds', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-10', () => ({
      windows: [{ id: 'w1', start: '09:00', end: '11:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    await repo.updateDay('2026-05-20', () => ({
      windows: [{ id: 'w2', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    const results = await repo.findEntriesByDateRange('2026-05-15', '2026-05-31', DEFAULT_WEEKDAY_HOURS)
    expect(results).toHaveLength(1)
    expect(results[0]?.category).toBe('_COREMEDIA')
    expect(results[0]?.hours).toBe(3)
  })

  it('clearCache forces a re-read from storage', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-06-07', () => ({
      windows: [{ id: 'w1', start: '09:00', end: '17:00', category: '_COREMEDIA', subtasks: [] }],
    }))
    const before = await repo.getMonth(2026, 6)
    expect(Object.keys(before)).toHaveLength(1)

    repo.clearCache()

    const after = await repo.getMonth(2026, 6)
    expect(Object.keys(after)).toHaveLength(1)
  })
})

describe('CloudSprintExportRepository', () => {
  it('saves and finds by sprint index', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudSprintExportRepository(adapter)
    await repo.save({ sprintIndex: 3, status: 'exported', exportedAt: '2024-02-01' })
    const result = await repo.findBySprintIndex(3)
    expect(result?.status).toBe('exported')
  })

  it('returns null for unknown sprint', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudSprintExportRepository(adapter)
    expect(await repo.findBySprintIndex(99)).toBeNull()
  })
})
