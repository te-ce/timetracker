// @vitest-environment node
import type { AppConfig } from '../types'
import type { StorageAdapter } from '../../storage/adapter'
import { InMemoryStorageAdapter } from '../../storage/in-memory-adapter'
import { CloudConfigRepository } from './config-repository'
import { CloudSprintExportRepository } from './sprint-export-repository'
import { CloudTimeTrackingRepository } from './time-tracking-repository'
import { CloudMonthRepository } from './month-repository'

function adapterWithValue(key: string, value: unknown): StorageAdapter {
  return {
    get<T>(k: string): Promise<T | null> {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      if (k === key) return Promise.resolve(value as T | null)
      return Promise.resolve(null)
    },
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  }
}

describe('CloudConfigRepository', () => {
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
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Stored config failed validation'), expect.anything())
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

describe('CloudMonthRepository', () => {
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
    const results = await repo.findEntriesByDateRange('2026-05-01', '2026-06-30')
    expect(results).toHaveLength(2)
    const e1 = results.find((e) => e.category === '_COREMEDIA')
    expect(e1?.date).toBe('2026-05-15')
    expect(e1?.hours).toBe(6)
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
    const results = await repo.findEntriesByDateRange('2026-05-15', '2026-05-31')
    expect(results).toHaveLength(1)
    expect(results[0]?.category).toBe('_COREMEDIA')
    expect(results[0]?.hours).toBe(3)
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

describe('CloudTimeTrackingRepository', () => {
  it('getActive returns null when nothing is tracked', async () => {
    const repo = new CloudTimeTrackingRepository(new InMemoryStorageAdapter())
    expect(await repo.getActive()).toBeNull()
  })

  it('start sets active tracking', async () => {
    const repo = new CloudTimeTrackingRepository(new InMemoryStorageAdapter())
    await repo.start('2026-05-25', '_SUPPORT')
    const active = await repo.getActive()
    expect(active?.category).toBe('_SUPPORT')
    expect(active?.date).toBe('2026-05-25')
  })

  it('stop returns null when nothing is tracked', async () => {
    const repo = new CloudTimeTrackingRepository(new InMemoryStorageAdapter())
    expect(await repo.stop()).toBeNull()
  })

  it('stop clears active tracking after starting', async () => {
    const repo = new CloudTimeTrackingRepository(new InMemoryStorageAdapter())
    await repo.start('2026-05-25', '_SUPPORT')
    await repo.stop()
    expect(await repo.getActive()).toBeNull()
  })

  it('getActive returns null and warns when stored tracking data is invalid', async () => {
    const adapter = adapterWithValue('active-tracking.json', { broken: true })
    const repo = new CloudTimeTrackingRepository(adapter)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await repo.getActive()).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid stored tracking data'), expect.anything())
    warnSpy.mockRestore()
  })

  it('stop returns hours when elapsed time is positive', async () => {
    vi.useFakeTimers()
    const repo = new CloudTimeTrackingRepository(new InMemoryStorageAdapter())
    await repo.start('2026-05-25', '_SUPPORT')
    vi.advanceTimersByTime(30 * 60 * 1000)
    const result = await repo.stop()
    expect(result).not.toBeNull()
    expect(result?.category).toBe('_SUPPORT')
    expect(result?.date).toBe('2026-05-25')
    expect(result?.hours).toBeGreaterThan(0)
    vi.useRealTimers()
  })
})
