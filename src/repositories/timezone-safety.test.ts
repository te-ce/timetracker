import { describe, it, expect } from 'vitest'
import { CloudWorkPeriodRepository } from './cloud/work-period-repository'
import { CloudTimeEntryRepository } from './cloud/time-entry-repository'
import { InMemoryStorageAdapter } from '../storage/in-memory-adapter'

describe('Timezone-safe date queries', () => {
  it('findByDate uses local date, not UTC (no off-by-one in UTC+ timezones)', async () => {
    const storage = new InMemoryStorageAdapter()
    const repo = new CloudWorkPeriodRepository(storage)
    await repo.save({ id: 'w1', date: '2026-05-19', start: '09:00', end: '17:00' })

    // new Date(2026, 4, 19) in UTC+2 = 2026-05-18T22:00:00Z
    // If using toISOString(), this would produce '2026-05-18' and miss the window
    const result = await repo.findByDate(new Date(2026, 4, 19))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('w1')
  })

  it('findByDateRange boundaries use local dates', async () => {
    const storage = new InMemoryStorageAdapter()
    const repo = new CloudWorkPeriodRepository(storage)
    await repo.save({ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' })
    await repo.save({ id: 'w2', date: '2026-05-31', start: '09:00', end: '17:00' })
    await repo.save({ id: 'w3', date: '2026-06-01', start: '09:00', end: '17:00' })

    // May 1 to May 31 — should include w1 and w2 but not w3
    const from = new Date(2026, 4, 1)
    const to = new Date(2026, 4, 31)
    const result = await repo.findByDateRange(from, to)
    expect(result).toHaveLength(2)
    expect(result.map(w => w.id)).toEqual(['w1', 'w2'])
  })

  it('time entry findByDateRange uses local dates', async () => {
    const storage = new InMemoryStorageAdapter()
    const repo = new CloudTimeEntryRepository(storage)
    await repo.save({ id: 'e1', date: '2026-05-19', category: 'QA', hours: 4 })

    // Same timezone issue: new Date(2026, 4, 19) should match '2026-05-19'
    const result = await repo.findByDateRange(new Date(2026, 4, 19), new Date(2026, 4, 19))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('e1')
  })

  it('shared repo: MonthView sees data saved in DayView', async () => {
    const storage = new InMemoryStorageAdapter()
    const repo = new CloudWorkPeriodRepository(storage)

    // DayView saves work window for May 19
    await repo.save({ id: 'w1', date: '2026-05-19', start: '08:00', end: '12:00' })
    await repo.save({ id: 'w2', date: '2026-05-19', start: '13:00', end: '17:00' })

    // MonthView queries the whole month
    const from = new Date(2026, 4, 1)
    const to = new Date(2026, 5, 0) // last day of May
    const windows = await repo.findByDateRange(from, to)

    expect(windows).toHaveLength(2)
    expect(windows.every(w => w.date === '2026-05-19')).toBe(true)
  })
})
