import { InMemoryStorageAdapter } from '../../storage/in-memory-adapter'
import { CloudConfigRepository } from './config-repository'
import { CloudTimeEntryRepository } from './time-entry-repository'
import { CloudWorkPeriodRepository } from './work-period-repository'
import { CloudSprintExportRepository } from './sprint-export-repository'
import { CloudWorkLocationRepository } from './work-location-repository'
import { CloudDayTypeOverrideRepository } from './day-type-override-repository'

describe('CloudConfigRepository', () => {
  it('returns defaults when no data stored', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    const config = await repo.get()
    expect(config.sollstunden).toBe(8)
    expect(config.customCategories).toEqual([])
  })

  it('persists and retrieves config', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudConfigRepository(adapter)
    await repo.save({ sollstunden: 7, autoCategory: 'QA', federalState: 'HH', sprintLengthDays: 10, sprintStartDate: '2024-01-01', customCategories: ['Custom1'] })
    // New instance to verify persistence through adapter
    const repo2 = new CloudConfigRepository(adapter)
    const config = await repo2.get()
    expect(config.sollstunden).toBe(7)
    expect(config.autoCategory).toBe('QA')
    expect(config.customCategories).toEqual(['Custom1'])
  })
})

describe('CloudTimeEntryRepository', () => {
  it('saves and finds entries by date range', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudTimeEntryRepository(adapter)
    await repo.save({ id: 'e1', date: '2024-01-15', category: 'QA', hours: 4 })
    await repo.save({ id: 'e2', date: '2024-01-16', category: 'Infra', hours: 2 })
    await repo.save({ id: 'e3', date: '2024-01-20', category: 'QA', hours: 3 })

    const results = await repo.findByDateRange(new Date('2024-01-15'), new Date('2024-01-16'))
    expect(results).toHaveLength(2)
  })

  it('updates existing entry', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudTimeEntryRepository(adapter)
    await repo.save({ id: 'e1', date: '2024-01-15', category: 'QA', hours: 4 })
    await repo.save({ id: 'e1', date: '2024-01-15', category: 'QA', hours: 6 })
    const results = await repo.findByDateRange(new Date('2024-01-15'), new Date('2024-01-15'))
    expect(results).toHaveLength(1)
    expect(results[0].hours).toBe(6)
  })

  it('deletes entry', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudTimeEntryRepository(adapter)
    await repo.save({ id: 'e1', date: '2024-01-15', category: 'QA', hours: 4 })
    await repo.delete('e1')
    const results = await repo.findByDateRange(new Date('2024-01-15'), new Date('2024-01-15'))
    expect(results).toHaveLength(0)
  })
})

describe('CloudWorkPeriodRepository', () => {
  it('saves and finds by date', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudWorkPeriodRepository(adapter)
    await repo.save({ id: 'w1', date: '2024-01-15', start: '09:00', end: '17:00' })
    const results = await repo.findByDate(new Date('2024-01-15'))
    expect(results).toHaveLength(1)
    expect(results[0].start).toBe('09:00')
  })

  it('finds by date range', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudWorkPeriodRepository(adapter)
    await repo.save({ id: 'w1', date: '2024-01-15', start: '09:00', end: '12:00' })
    await repo.save({ id: 'w2', date: '2024-01-16', start: '10:00', end: '18:00' })
    const results = await repo.findByDateRange(new Date('2024-01-15'), new Date('2024-01-16'))
    expect(results).toHaveLength(2)
  })

  it('deletes window', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudWorkPeriodRepository(adapter)
    await repo.save({ id: 'w1', date: '2024-01-15', start: '09:00', end: '17:00' })
    await repo.delete('w1')
    const results = await repo.findByDate(new Date('2024-01-15'))
    expect(results).toHaveLength(0)
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

describe('CloudWorkLocationRepository', () => {
  it('saves and finds by date', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudWorkLocationRepository(adapter)
    await repo.save('2024-01-15', 'Office')
    expect(await repo.findByDate('2024-01-15')).toBe('Office')
  })

  it('deletes location', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudWorkLocationRepository(adapter)
    await repo.save('2024-01-15', 'Remote')
    await repo.delete('2024-01-15')
    expect(await repo.findByDate('2024-01-15')).toBeNull()
  })

  it('finds by date range', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudWorkLocationRepository(adapter)
    await repo.save('2024-01-15', 'Office')
    await repo.save('2024-01-16', 'Remote')
    await repo.save('2024-01-20', 'Office')
    const result = await repo.findByDateRange('2024-01-15', '2024-01-16')
    expect(result.size).toBe(2)
  })
})

describe('CloudDayTypeOverrideRepository', () => {
  it('saves and finds by date', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudDayTypeOverrideRepository(adapter)
    await repo.save('2024-01-15', 'Vacation')
    expect(await repo.findByDate('2024-01-15')).toBe('Vacation')
  })

  it('deletes override', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudDayTypeOverrideRepository(adapter)
    await repo.save('2024-01-15', 'SickDay')
    await repo.delete('2024-01-15')
    expect(await repo.findByDate('2024-01-15')).toBeNull()
  })

  it('finds by date range', async () => {
    const adapter = new InMemoryStorageAdapter()
    const repo = new CloudDayTypeOverrideRepository(adapter)
    await repo.save('2024-01-15', 'Vacation')
    await repo.save('2024-01-16', 'SickDay')
    await repo.save('2024-01-20', 'Absence')
    const result = await repo.findByDateRange('2024-01-15', '2024-01-16')
    expect(result.size).toBe(2)
  })
})
