import { describe, expect, it } from 'vitest'
import {
  InMemoryConfigRepository,
  InMemoryTimeEntryRepository,
  InMemoryWorkWindowRepository,
  InMemorySprintExportRepository,
  InMemoryWorkLocationRepository,
} from './index'
import type { AppConfig, TimeEntry, WorkWindow, SprintExport, WorkLocation } from '../types'

const firstEntry: TimeEntry = {
  id: 'entry-1',
  date: '2025-01-10',
  category: 'Architecture',
  hours: 2.5,
}

const secondEntry: TimeEntry = {
  id: 'entry-2',
  date: '2025-01-11',
  category: 'QA',
  hours: 1.5,
}

const morningWindow: WorkWindow = {
  id: 'window-1',
  date: '2025-01-10',
  start: '09:00',
  end: '12:00',
}

const afternoonWindow: WorkWindow = {
  id: 'window-2',
  date: '2025-01-10',
  start: '13:00',
  end: '17:00',
}

const config: AppConfig = {
  sollstunden: 7.5,
  autoCategory: 'Support',
  federalState: 'Hamburg',
  sprintLengthDays: 10,
  sprintStartDate: '2025-01-06',
  customCategories: [],
}

describe('InMemoryTimeEntryRepository', () => {
  it('stores entries and filters by date range', async () => {
    const repository = new InMemoryTimeEntryRepository([firstEntry])

    await repository.save(secondEntry)

    await expect(
      repository.findByDateRange(new Date('2025-01-10'), new Date('2025-01-10')),
    ).resolves.toEqual([firstEntry])
  })
})

describe('InMemoryWorkWindowRepository', () => {
  it('stores, loads and deletes windows', async () => {
    const repository = new InMemoryWorkWindowRepository([morningWindow])

    await repository.save(afternoonWindow)

    await expect(repository.findByDate(new Date('2025-01-10'))).resolves.toEqual([
      morningWindow,
      afternoonWindow,
    ])

    await repository.delete(morningWindow.id)

    await expect(repository.findByDate(new Date('2025-01-10'))).resolves.toEqual([
      afternoonWindow,
    ])
  })

  it('saves and retrieves an open WorkWindow (end: null)', async () => {
    const repository = new InMemoryWorkWindowRepository()
    const openWindow: WorkWindow = { id: 'open-1', date: '2025-01-10', start: '09:00', end: null }

    await repository.save(openWindow)

    await expect(repository.findByDate(new Date('2025-01-10'))).resolves.toEqual([openWindow])
  })
})

describe('InMemoryConfigRepository', () => {
  it('reads and updates configuration', async () => {
    const repository = new InMemoryConfigRepository()

    await repository.save(config)

    await expect(repository.get()).resolves.toEqual(config)
  })
})

describe('InMemorySprintExportRepository', () => {
  it('returns null for unknown sprint index', async () => {
    const repository = new InMemorySprintExportRepository()
    await expect(repository.findBySprintIndex(99)).resolves.toBeNull()
  })

  it('saves and retrieves sprint export status', async () => {
    const repository = new InMemorySprintExportRepository()
    const sprintExport: SprintExport = {
      sprintIndex: 5,
      status: 'exported',
      exportedAt: '2026-05-17',
    }

    await repository.save(sprintExport)

    await expect(repository.findBySprintIndex(5)).resolves.toEqual(sprintExport)
  })

  it('overwrites existing export status on save', async () => {
    const repository = new InMemorySprintExportRepository()
    await repository.save({ sprintIndex: 3, status: 'pending', exportedAt: null })
    await repository.save({ sprintIndex: 3, status: 'exported', exportedAt: '2026-05-20' })

    const result = await repository.findBySprintIndex(3)
    expect(result?.status).toBe('exported')
    expect(result?.exportedAt).toBe('2026-05-20')
  })
})

describe('InMemoryWorkLocationRepository', () => {
  it('returns null for unknown date', async () => {
    const repo = new InMemoryWorkLocationRepository()
    await expect(repo.findByDate('2026-05-19')).resolves.toBeNull()
  })

  it('saves and retrieves location for a date', async () => {
    const repo = new InMemoryWorkLocationRepository()
    await repo.save('2026-05-19', 'Office')
    await expect(repo.findByDate('2026-05-19')).resolves.toBe('Office')
  })

  it('overwrites location on re-save', async () => {
    const repo = new InMemoryWorkLocationRepository()
    await repo.save('2026-05-19', 'Office')
    await repo.save('2026-05-19', 'Remote')
    await expect(repo.findByDate('2026-05-19')).resolves.toBe('Remote')
  })

  it('deletes location', async () => {
    const repo = new InMemoryWorkLocationRepository()
    await repo.save('2026-05-19', 'Office')
    await repo.delete('2026-05-19')
    await expect(repo.findByDate('2026-05-19')).resolves.toBeNull()
  })

  it('finds locations by date range', async () => {
    const repo = new InMemoryWorkLocationRepository()
    await repo.save('2026-05-18', 'Office')
    await repo.save('2026-05-19', 'Remote')
    await repo.save('2026-05-25', 'Office')

    const result = await repo.findByDateRange('2026-05-18', '2026-05-20')
    expect(result.size).toBe(2)
    expect(result.get('2026-05-18')).toBe('Office')
    expect(result.get('2026-05-19')).toBe('Remote')
  })
})
