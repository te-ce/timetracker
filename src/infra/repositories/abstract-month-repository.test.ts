// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { InMemoryStorageAdapter } from '../storage/in-memory-adapter'
import { CloudMonthRepository } from './cloud/month-repository'
import { InMemoryMonthRepository } from './in-memory/month-repository'
import type { AbstractMonthRepository } from './abstract-month-repository'
import type { WorkPeriod, WorkPeriodSubtask } from './types'

/**
 * Contract test for AbstractMonthRepository — the ~14 mutation verbs shared by
 * every MonthRepository adapter. Runs against both real adapters so a
 * regression in shared behavior can't hide behind one adapter's name.
 */
const ADAPTERS: [string, () => AbstractMonthRepository][] = [
  ['CloudMonthRepository', () => new CloudMonthRepository(new InMemoryStorageAdapter())],
  ['InMemoryMonthRepository', () => new InMemoryMonthRepository()],
]

function makePeriod(overrides: Partial<WorkPeriod> = {}): WorkPeriod {
  return { id: 'p1', start: '09:00', end: '17:00', category: '_COREMEDIA', subtasks: [], ...overrides }
}

async function seedDay(repo: AbstractMonthRepository, date: string, period: WorkPeriod) {
  await repo.updateDay(date, (day) => ({ ...day, windows: [period] }))
}

describe.each(ADAPTERS)('%s (AbstractMonthRepository contract)', (_, makeRepo) => {
  describe('confirmDay / unconfirmDay', () => {
    it('confirmDay sets confirmed=true on the day', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.confirmDay('2026-06-07')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.confirmed).toBe(true)
    })

    it('unconfirmDay sets confirmed=false on the day', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.confirmDay('2026-06-07')
      await repo.unconfirmDay('2026-06-07')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.confirmed).toBe(false)
    })
  })

  describe('toggleLocation', () => {
    it('sets location to Office when current effective is Remote', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.toggleLocation('2026-06-07', 'Remote')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.location).toBe('Office')
    })

    it('sets location to Remote when current effective is Office', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.toggleLocation('2026-06-07', 'Office')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.location).toBe('Remote')
    })
  })

  describe('saveNote', () => {
    it('saves a non-empty note', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.saveNote('2026-06-07', 'Team sync day')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.note).toBe('Team sync day')
    })

    it('removes note when empty string passed', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.saveNote('2026-06-07', 'Some note')
      await repo.saveNote('2026-06-07', '')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.note).toBeUndefined()
    })
  })

  describe('resetDay', () => {
    it('clears windows for the day', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod())
      await repo.resetDay('2026-06-07')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']).toBeUndefined()
    })
  })

  describe('saveWorkPeriod', () => {
    it('adds a new work period', async () => {
      const repo = makeRepo()
      const period = makePeriod({ id: 'new-p' })
      await repo.saveWorkPeriod('2026-06-07', period)
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows).toHaveLength(1)
      expect(data['2026-06-07']?.windows[0]?.id).toBe('new-p')
    })

    it('updates an existing period with same id', async () => {
      const repo = makeRepo()
      const period = makePeriod({ id: 'p1', end: '12:00' })
      await seedDay(repo, '2026-06-07', period)
      await repo.saveWorkPeriod('2026-06-07', { ...period, end: '15:00' })
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows[0]?.end).toBe('15:00')
    })
  })

  describe('saveWorkPeriodWithAbsorbed', () => {
    it('removes absorbed period ids and upserts the new period', async () => {
      const repo = makeRepo()
      const p1 = makePeriod({ id: 'p1' })
      const p2 = makePeriod({ id: 'p2', start: '14:00', end: '17:00' })
      await repo.updateDay('2026-06-07', (day) => ({ ...day, windows: [p1, p2] }))
      const merged = makePeriod({ id: 'p-merged', start: '09:00', end: '17:00' })
      await repo.saveWorkPeriodWithAbsorbed('2026-06-07', merged, ['p1', 'p2'])
      const data = await repo.getMonth(2026, 6)
      const windows = data['2026-06-07']?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]?.id).toBe('p-merged')
    })
  })

  describe('removeWorkPeriod', () => {
    it('removes period by id', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1' }))
      await repo.removeWorkPeriod('2026-06-07', 'p1')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']).toBeUndefined()
    })
  })

  describe('setPeriodCategory', () => {
    it('updates the category of the specified period', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1', category: '_COREMEDIA' }))
      await repo.setPeriodCategory('2026-06-07', 'p1', '_SUPPORT')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows[0]?.category).toBe('_SUPPORT')
    })
  })

  describe('addSubtask / removeSubtask', () => {
    it('addSubtask inserts a subtask into the period', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1' }))
      const subtask: WorkPeriodSubtask = { id: 's1', category: '_SUPPORT', hours: 1 }
      await repo.addSubtask('2026-06-07', 'p1', subtask)
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows[0]?.subtasks).toHaveLength(1)
      expect(data['2026-06-07']?.windows[0]?.subtasks[0]?.id).toBe('s1')
    })

    it('removeSubtask removes the subtask by id', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1' }))
      const subtask: WorkPeriodSubtask = { id: 's1', category: '_SUPPORT', hours: 1 }
      await repo.addSubtask('2026-06-07', 'p1', subtask)
      await repo.removeSubtask('2026-06-07', 'p1', 's1')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows[0]?.subtasks).toHaveLength(0)
    })
  })

  describe('stopWorkPeriod', () => {
    it('sets end time on the specified period', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1', end: null }))
      await repo.stopWorkPeriod('2026-06-07', 'p1', '17:30')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows[0]?.end).toBe('17:30')
    })
  })

  describe('startLiveSubtask / stopLiveSubtask', () => {
    it('startLiveSubtask adds a live subtask with startedAt', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1' }))
      const subtask: WorkPeriodSubtask & { startedAt: string } = {
        id: 'live-s1',
        category: '_SUPPORT',
        hours: 0,
        startedAt: '2026-06-07T09:00:00Z',
      }
      await repo.startLiveSubtask('2026-06-07', 'p1', subtask)
      const data = await repo.getMonth(2026, 6)
      const subtasks = data['2026-06-07']?.windows[0]?.subtasks ?? []
      expect(subtasks.some((s) => s.id === 'live-s1')).toBe(true)
    })

    it('stopLiveSubtask sets stoppedAt on the live subtask', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1' }))
      const subtask: WorkPeriodSubtask & { startedAt: string } = {
        id: 'live-s1',
        category: '_SUPPORT',
        hours: 0,
        startedAt: '2026-06-07T09:00:00Z',
      }
      await repo.startLiveSubtask('2026-06-07', 'p1', subtask)
      await repo.stopLiveSubtask('2026-06-07', 'p1', 'live-s1', '2026-06-07T10:00:00Z')
      const data = await repo.getMonth(2026, 6)
      const found = data['2026-06-07']?.windows[0]?.subtasks.find((s) => s.id === 'live-s1')
      expect(found?.stoppedAt).toBe('2026-06-07T10:00:00Z')
    })
  })

  describe('openWorkPeriod', () => {
    it('adds an open (null-end) period when no open period exists', async () => {
      const repo = makeRepo()
      await repo.openWorkPeriod('2026-06-07', '_COREMEDIA', '09:00')
      const data = await repo.getMonth(2026, 6)
      const windows = data['2026-06-07']?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]?.end).toBeNull()
      expect(windows[0]?.category).toBe('_COREMEDIA')
    })

    it('does not add another open period when one already exists', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1', end: null }))
      await repo.openWorkPeriod('2026-06-07', '_SUPPORT', '10:00')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows).toHaveLength(1)
    })
  })

  describe('closeOpenWorkPeriod', () => {
    it('closes the open period by setting end time', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1', start: '09:00', end: null }))
      await repo.closeOpenWorkPeriod('2026-06-07', '_COREMEDIA', '17:00')
      const data = await repo.getMonth(2026, 6)
      const windows = data['2026-06-07']?.windows ?? []
      expect(windows.every((w) => w.end !== null)).toBe(true)
    })

    it('does nothing when no open period exists', async () => {
      const repo = makeRepo()
      await seedDay(repo, '2026-06-07', makePeriod({ id: 'p1', start: '09:00', end: '17:00' }))
      await repo.closeOpenWorkPeriod('2026-06-07', '_COREMEDIA', '18:00')
      const data = await repo.getMonth(2026, 6)
      expect(data['2026-06-07']?.windows[0]?.end).toBe('17:00')
    })
  })
})
