import { describe, expect, it } from 'vitest'
import {
  InMemoryConfigRepository,
  InMemoryTimeEntryRepository,
  InMemoryWorkPeriodRepository,
  InMemorySprintExportRepository,
  InMemoryWorkLocationRepository,
  InMemoryDayConfirmationRepository,
} from './index'
import type { AppConfig, TimeEntry, WorkPeriod, SprintExport } from '../types'

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

const morningWindow: WorkPeriod = {
  id: 'window-1',
  date: '2025-01-10',
  start: '09:00',
  end: '12:00',
}

const afternoonWindow: WorkPeriod = {
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

    await expect(repository.findByDateRange(new Date('2025-01-10'), new Date('2025-01-10'))).resolves.toEqual([
      firstEntry,
    ])
  })
})

describe('InMemoryWorkPeriodRepository', () => {
  it('stores, loads and deletes windows', async () => {
    const repository = new InMemoryWorkPeriodRepository([morningWindow])

    await repository.save(afternoonWindow)

    await expect(repository.findByDate(new Date('2025-01-10'))).resolves.toEqual([morningWindow, afternoonWindow])

    await repository.delete(morningWindow.id)

    await expect(repository.findByDate(new Date('2025-01-10'))).resolves.toEqual([afternoonWindow])
  })

  it('saves and retrieves an open WorkPeriod (end: null)', async () => {
    const repository = new InMemoryWorkPeriodRepository()
    const openWindow: WorkPeriod = { id: 'open-1', date: '2025-01-10', start: '09:00', end: null }

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

describe('InMemoryDayConfirmationRepository', () => {
  it('isConfirmed returns false for an unknown date', async () => {
    const repo = new InMemoryDayConfirmationRepository()
    await expect(repo.isConfirmed('2026-05-25')).resolves.toBe(false)
  })

  it('confirm marks a date as confirmed', async () => {
    const repo = new InMemoryDayConfirmationRepository()
    await repo.confirm('2026-05-25')
    await expect(repo.isConfirmed('2026-05-25')).resolves.toBe(true)
  })

  it('unconfirm removes a previously confirmed date', async () => {
    const repo = new InMemoryDayConfirmationRepository()
    await repo.confirm('2026-05-25')
    await repo.unconfirm('2026-05-25')
    await expect(repo.isConfirmed('2026-05-25')).resolves.toBe(false)
  })

  it('unconfirm on an unknown date is a no-op', async () => {
    const repo = new InMemoryDayConfirmationRepository()
    await expect(repo.unconfirm('2026-05-25')).resolves.toBeUndefined()
    await expect(repo.isConfirmed('2026-05-25')).resolves.toBe(false)
  })

  it('accepts initial confirmed dates via constructor', async () => {
    const repo = new InMemoryDayConfirmationRepository(['2026-05-20', '2026-05-21'])
    await expect(repo.isConfirmed('2026-05-20')).resolves.toBe(true)
    await expect(repo.isConfirmed('2026-05-21')).resolves.toBe(true)
    await expect(repo.isConfirmed('2026-05-22')).resolves.toBe(false)
  })

  it('findConfirmedInRange returns only dates within the range', async () => {
    const repo = new InMemoryDayConfirmationRepository(['2026-05-18', '2026-05-19', '2026-05-25'])
    const result = await repo.findConfirmedInRange('2026-05-18', '2026-05-20')
    expect(result.size).toBe(2)
    expect(result.has('2026-05-18')).toBe(true)
    expect(result.has('2026-05-19')).toBe(true)
    expect(result.has('2026-05-25')).toBe(false)
  })

  it('findConfirmedInRange returns empty set when no dates are in range', async () => {
    const repo = new InMemoryDayConfirmationRepository(['2026-05-18'])
    const result = await repo.findConfirmedInRange('2026-06-01', '2026-06-30')
    expect(result.size).toBe(0)
  })

  it('findConfirmedInRange includes boundary dates', async () => {
    const repo = new InMemoryDayConfirmationRepository(['2026-05-01', '2026-05-31'])
    const result = await repo.findConfirmedInRange('2026-05-01', '2026-05-31')
    expect(result.size).toBe(2)
  })

  it('multiple confirms for the same date are idempotent', async () => {
    const repo = new InMemoryDayConfirmationRepository()
    await repo.confirm('2026-05-25')
    await repo.confirm('2026-05-25')
    await expect(repo.isConfirmed('2026-05-25')).resolves.toBe(true)
    const result = await repo.findConfirmedInRange('2026-05-25', '2026-05-25')
    expect(result.size).toBe(1)
  })
})
