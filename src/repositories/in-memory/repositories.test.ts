import { describe, expect, it } from 'vitest'
import {
  InMemoryConfigRepository,
  InMemoryTimeEntryRepository,
  InMemoryWorkWindowRepository,
} from './index'
import type { AppConfig, TimeEntry, WorkWindow } from '../types'

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
})

describe('InMemoryConfigRepository', () => {
  it('reads and updates configuration', async () => {
    const repository = new InMemoryConfigRepository()

    await repository.save(config)

    await expect(repository.get()).resolves.toEqual(config)
  })
})
