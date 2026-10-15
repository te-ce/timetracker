// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { InMemoryStorageAdapter } from '../storage/in-memory-adapter'
import { CloudMonthRepository } from './cloud/month-repository'
import { InMemoryMonthRepository } from './in-memory/month-repository'
import { TrashRepository as CloudTrashRepository } from './trash-repository'
import { InMemoryTrashRepository } from './in-memory/trash-repository'
import type { MonthRepository, TrashRepository, WorkPeriod } from './types'

const IMPLEMENTATIONS: [string, () => { monthRepo: MonthRepository; trashRepo: TrashRepository }][] = [
  [
    'TrashRepository (cloud)',
    () => {
      const adapter = new InMemoryStorageAdapter()
      const monthRepo = new CloudMonthRepository(adapter)
      return { monthRepo, trashRepo: new CloudTrashRepository(adapter, monthRepo) }
    },
  ],
  [
    'InMemoryTrashRepository',
    () => {
      const monthRepo = new InMemoryMonthRepository()
      return { monthRepo, trashRepo: new InMemoryTrashRepository(monthRepo) }
    },
  ],
]

function makePeriod(overrides: Partial<WorkPeriod> = {}): WorkPeriod {
  return { id: 'p1', start: '09:00', end: '17:00', category: '_COREMEDIA', subtasks: [], ...overrides }
}

describe('TrashRepository (cloud) write batching', () => {
  it('trashes and restores a month with one write per file instead of one per day', async () => {
    const adapter = new InMemoryStorageAdapter()
    const putSpy = vi.spyOn(adapter, 'put')
    const monthRepo = new CloudMonthRepository(adapter)
    const trashRepo = new CloudTrashRepository(adapter, monthRepo)
    const data = {
      '2026-06-01': { windows: [makePeriod()] },
      '2026-06-02': { windows: [makePeriod()] },
      '2026-06-03': { windows: [makePeriod()] },
    }

    const id = await trashRepo.moveMonthToTrash(2026, 6, data)
    await trashRepo.restore(id)

    const keys = putSpy.mock.calls.map(([key]) => key)
    expect(keys.filter((k) => k === `trash/${id}.json`)).toHaveLength(1)
    expect(keys.filter((k) => k === 'months/2026-06.json')).toHaveLength(1)
  })
})

describe.each(IMPLEMENTATIONS)('%s', (_, make) => {
  describe('moveMonthToTrash / list / restore', () => {
    it('lists a trashed month and restores it back into the month repository', async () => {
      const { monthRepo, trashRepo } = make()
      const snapshot = { '2026-06-07': { windows: [makePeriod()] } }

      const id = await trashRepo.moveMonthToTrash(2026, 6, snapshot)

      const entries = await trashRepo.list()
      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({ id, type: 'month', year: 2026, month: 6 })

      await trashRepo.restore(id)
      const restored = await monthRepo.getMonth(2026, 6)
      expect(restored['2026-06-07']?.windows).toHaveLength(1)

      expect(await trashRepo.list()).toHaveLength(0)
    })
  })

  describe('restore merges into existing data', () => {
    it('restoring a month keeps current days and adds trashed periods that are missing', async () => {
      const { monthRepo, trashRepo } = make()
      const id = await trashRepo.moveMonthToTrash(2026, 6, {
        '2026-06-01': { windows: [makePeriod({ id: 't1' }), makePeriod({ id: 't2', start: '18:00', end: '19:00' })] },
        '2026-06-02': { windows: [makePeriod({ id: 't3' })] },
      })
      await monthRepo.updateDay('2026-06-01', () => ({ windows: [makePeriod({ id: 'new' })], note: 'tracked later' }))

      await trashRepo.restore(id)

      const month = await monthRepo.getMonth(2026, 6)
      expect(month['2026-06-01']?.windows.map((w) => w.id)).toEqual(['new', 't2'])
      expect(month['2026-06-01']?.note).toBe('tracked later')
      expect(month['2026-06-02']?.windows.map((w) => w.id)).toEqual(['t3'])
    })

    it('restoring a day keeps periods tracked since it was trashed', async () => {
      const { monthRepo, trashRepo } = make()
      const id = await trashRepo.moveDayToTrash('2026-06-07', { windows: [makePeriod({ id: 't1' })] })
      await monthRepo.updateDay('2026-06-07', () => ({
        windows: [makePeriod({ id: 'new', start: '18:00', end: '19:00' })],
      }))

      await trashRepo.restore(id)

      const month = await monthRepo.getMonth(2026, 6)
      expect(month['2026-06-07']?.windows.map((w) => w.id)).toEqual(['new', 't1'])
    })
  })

  describe('moveDayToTrash / restore', () => {
    it('restores a trashed day back into the month repository', async () => {
      const { monthRepo, trashRepo } = make()
      const day = { windows: [makePeriod()], location: 'Office' as const }

      const id = await trashRepo.moveDayToTrash('2026-06-07', day)
      const entries = await trashRepo.list()
      expect(entries).toMatchObject([{ id, type: 'day', date: '2026-06-07', year: 2026, month: 6 }])

      await trashRepo.restore(id)
      const restored = await monthRepo.getMonth(2026, 6)
      expect(restored['2026-06-07']?.location).toBe('Office')
      expect(restored['2026-06-07']?.windows).toHaveLength(1)
    })
  })

  describe('purge', () => {
    it('removes the entry without restoring it', async () => {
      const { monthRepo, trashRepo } = make()
      const id = await trashRepo.moveMonthToTrash(2026, 6, { '2026-06-07': { windows: [makePeriod()] } })

      await trashRepo.purge(id)

      expect(await trashRepo.list()).toHaveLength(0)
      expect(await monthRepo.getMonth(2026, 6)).toEqual({})
    })
  })

  describe('purgeExpired', () => {
    it('keeps entries newer than the retention window', async () => {
      const { trashRepo } = make()
      await trashRepo.moveMonthToTrash(2026, 6, { '2026-06-07': { windows: [makePeriod()] } })

      await trashRepo.purgeExpired(30)

      expect(await trashRepo.list()).toHaveLength(1)
    })

    it('drops entries older than the retention window', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      const { trashRepo } = make()
      await trashRepo.moveMonthToTrash(2026, 1, { '2026-01-05': { windows: [makePeriod()] } })

      vi.setSystemTime(new Date('2026-02-15T00:00:00Z'))
      await trashRepo.purgeExpired(30)

      expect(await trashRepo.list()).toHaveLength(0)
      vi.useRealTimers()
    })
  })
})
