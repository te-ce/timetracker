import { InMemoryStorageAdapter } from '../../storage/in-memory-adapter'
import { CloudConfigRepository } from './config-repository'
import { CloudSprintExportRepository } from './sprint-export-repository'
import { CloudTimeTrackingRepository } from './time-tracking-repository'
import { CloudMonthRepository } from './month-repository'

describe('CloudConfigRepository', () => {
  it('returns defaults when no data stored', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    const config = await repo.get()
    expect(config.sollstunden).toBe(8)
    expect(config.customCategories).toEqual([])
  })

  it('returned config is isolated — mutating it does not corrupt cached state', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    await repo.save({
      sollstunden: 8,
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
    const config = {
      sollstunden: 8,
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
      customCategories: ['A'],
      categoryMapping: { A: 'original' },
    }
    await repo.save(config)

    config.customCategories.push('mutated')
    config.categoryMapping['injected'] = 'bad'

    const stored = await repo.get()
    expect(stored.customCategories).toEqual(['A'])
    expect(stored.categoryMapping).toEqual({ A: 'original' })
  })

  it('persists and retrieves config', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    await repo.save({
      sollstunden: 7,
      autoCategory: 'QA',
      federalState: 'HH',
      sprintLengthDays: 10,
      sprintStartDate: '2024-01-01',
      customCategories: ['Custom1'],
    })
    const repo2 = new CloudConfigRepository(adapter)
    const config = await repo2.get()
    expect(config.sollstunden).toBe(7)
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
      entries: [{ id: 'e1', category: '_COREMEDIA', hours: 6 }],
    }))
    const data = await repo.getMonth(2026, 5)
    expect(data['2026-05-15']?.entries).toHaveLength(1)
    expect(data['2026-05-15']?.entries[0]?.hours).toBe(6)
  })

  it('updateDay removes day when empty', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', (day) => ({
      ...day,
      entries: [{ id: 'e1', category: '_COREMEDIA', hours: 6 }],
    }))
    await repo.updateDay('2026-05-15', (day) => ({
      ...day,
      entries: [],
    }))
    const data = await repo.getMonth(2026, 5)
    expect(data['2026-05-15']).toBeUndefined()
  })

  it('deleteMonth removes all data for month', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', () => ({
      entries: [{ id: 'e1', category: '_COREMEDIA', hours: 6 }],
      windows: [],
    }))
    await repo.deleteMonth(2026, 5)
    const data = await repo.getMonth(2026, 5)
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('getAllMonths returns months that have data', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', () => ({
      entries: [{ id: 'e1', category: '_COREMEDIA', hours: 6 }],
      windows: [],
    }))
    await repo.updateDay('2026-06-01', () => ({
      entries: [{ id: 'e2', category: '_SUPPORT', hours: 4 }],
      windows: [],
    }))
    const months = await repo.getAllMonths()
    expect(months).toContain('2026-05')
    expect(months).toContain('2026-06')
  })

  it('findEntriesByDateRange returns dated entries across months', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-15', () => ({
      entries: [{ id: 'e1', category: '_COREMEDIA', hours: 6 }],
      windows: [],
    }))
    await repo.updateDay('2026-06-01', () => ({
      entries: [{ id: 'e2', category: '_SUPPORT', hours: 4 }],
      windows: [],
    }))
    const results = await repo.findEntriesByDateRange('2026-05-01', '2026-06-30')
    expect(results).toHaveLength(2)
    const e1 = results.find((e) => e.id === 'e1')
    expect(e1?.date).toBe('2026-05-15')
    expect(e1?.hours).toBe(6)
  })

  it('findEntriesByDateRange filters by date bounds', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudMonthRepository(adapter)
    await repo.updateDay('2026-05-10', () => ({
      entries: [{ id: 'e1', category: '_COREMEDIA', hours: 2 }],
      windows: [],
    }))
    await repo.updateDay('2026-05-20', () => ({
      entries: [{ id: 'e2', category: '_COREMEDIA', hours: 3 }],
      windows: [],
    }))
    const results = await repo.findEntriesByDateRange('2026-05-15', '2026-05-31')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('e2')
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
