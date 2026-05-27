import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { CloudWorkPeriodRepository } from './cloud/work-period-repository'
import { CloudTimeEntryRepository } from './cloud/time-entry-repository'

describe('LocalStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('work windows persist across repository instances', async () => {
    const storage = new LocalStorageAdapter('test_')
    const repo1 = new CloudWorkPeriodRepository(storage)
    await repo1.save({ id: 'w1', date: '2026-05-19', start: '09:00', end: '12:00' })

    // New repo instance same storage = simulates page reload
    const repo2 = new CloudWorkPeriodRepository(storage)
    const windows = await repo2.findByDate(new Date(2026, 4, 19))
    expect(windows).toHaveLength(1)
    expect(windows[0]!.id).toBe('w1')
  })

  it('time entries persist across repository instances', async () => {
    const storage = new LocalStorageAdapter('test_')
    const repo1 = new CloudTimeEntryRepository(storage)
    await repo1.save({ id: 'e1', date: '2026-05-19', category: 'QA', hours: 4 })

    const repo2 = new CloudTimeEntryRepository(storage)
    const entries = await repo2.findByDateRange(new Date(2026, 4, 19), new Date(2026, 4, 19))
    expect(entries).toHaveLength(1)
    expect(entries[0]!.hours).toBe(4)
  })

  it('data saved in DayView date query is found by MonthView date range query', async () => {
    const storage = new LocalStorageAdapter('test_')
    const repo = new CloudWorkPeriodRepository(storage)

    // Simulate DayView saving a work window
    await repo.save({ id: 'w1', date: '2026-05-19', start: '09:00', end: '17:00' })

    // Simulate MonthView querying the full month range
    const from = new Date(2026, 4, 1) // May 1
    const to = new Date(2026, 5, 0) // May 31
    const windows = await repo.findByDateRange(from, to)

    expect(windows).toHaveLength(1)
    expect(windows[0]!.date).toBe('2026-05-19')
  })
})
