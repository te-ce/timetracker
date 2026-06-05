import { describe, it, expect } from 'vitest'
import { renameCategoryAcrossAllMonths } from './categoryMutations'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { WorkPeriod } from '../../infra/repositories/types'

function period(id: string, category: string, subtasks: WorkPeriod['subtasks'] = []): WorkPeriod {
  return { id, start: '09:00', end: '10:00', category, subtasks }
}

describe('renameCategoryAcrossAllMonths', () => {
  describe('config mutations', () => {
    it('renames in customCategories', async () => {
      const cfg = { ...DEFAULT_APP_CONFIG, customCategories: ['OldName', 'Other'] }
      const configRepo = new InMemoryConfigRepository(cfg)
      const monthRepo = new InMemoryMonthRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const saved = await configRepo.get()
      expect(saved.customCategories).toEqual(['NewName', 'Other'])
    })

    it('renames in categoryOrder', async () => {
      const cfg = { ...DEFAULT_APP_CONFIG, customCategories: ['OldName'], categoryOrder: ['OldName', '_COREMEDIA'] }
      const configRepo = new InMemoryConfigRepository(cfg)
      const monthRepo = new InMemoryMonthRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const saved = await configRepo.get()
      expect(saved.categoryOrder).toEqual(['NewName', '_COREMEDIA'])
    })

    it('renames keys in categoryDescriptions', async () => {
      const cfg = {
        ...DEFAULT_APP_CONFIG,
        customCategories: ['OldName'],
        categoryDescriptions: { OldName: 'desc', Other: 'other desc' },
      }
      const configRepo = new InMemoryConfigRepository(cfg)
      const monthRepo = new InMemoryMonthRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const saved = await configRepo.get()
      expect(saved.categoryDescriptions).toEqual({ NewName: 'desc', Other: 'other desc' })
    })

    it('renames keys in categoryMapping', async () => {
      const cfg = {
        ...DEFAULT_APP_CONFIG,
        customCategories: ['OldName'],
        categoryMapping: { OldName: 'TASK-1', Other: 'TASK-2' },
      }
      const configRepo = new InMemoryConfigRepository(cfg)
      const monthRepo = new InMemoryMonthRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const saved = await configRepo.get()
      expect(saved.categoryMapping).toEqual({ NewName: 'TASK-1', Other: 'TASK-2' })
    })

    it('handles undefined categoryDescriptions and categoryMapping', async () => {
      const cfg = {
        ...DEFAULT_APP_CONFIG,
        customCategories: ['OldName'],
        categoryDescriptions: undefined,
        categoryMapping: undefined,
      }
      const configRepo = new InMemoryConfigRepository(cfg)
      const monthRepo = new InMemoryMonthRepository()

      await expect(renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)).resolves.toBeUndefined()

      const saved = await configRepo.get()
      expect(saved.categoryDescriptions).toBeUndefined()
      expect(saved.categoryMapping).toBeUndefined()
    })

    it('leaves unrelated categories unchanged', async () => {
      const cfg = {
        ...DEFAULT_APP_CONFIG,
        customCategories: ['Unrelated'],
        categoryOrder: ['Unrelated'],
        categoryDescriptions: { Unrelated: 'desc' },
        categoryMapping: { Unrelated: 'TASK-9' },
      }
      const configRepo = new InMemoryConfigRepository(cfg)
      const monthRepo = new InMemoryMonthRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const saved = await configRepo.get()
      expect(saved.customCategories).toEqual(['Unrelated'])
      expect(saved.categoryDescriptions).toEqual({ Unrelated: 'desc' })
      expect(saved.categoryMapping).toEqual({ Unrelated: 'TASK-9' })
    })
  })

  describe('month data mutations', () => {
    it('renames window.category across all months', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-01': { '2026-01-10': { windows: [period('a', 'OldName')] } },
        '2026-02': { '2026-02-05': { windows: [period('b', 'OldName')] } },
      })
      const configRepo = new InMemoryConfigRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const jan = await monthRepo.getMonth(2026, 1)
      expect(jan['2026-01-10']?.windows[0]?.category).toBe('NewName')
      const feb = await monthRepo.getMonth(2026, 2)
      expect(feb['2026-02-05']?.windows[0]?.category).toBe('NewName')
    })

    it('renames slice.category within windows', async () => {
      const w = period('a', '_OTHER', [{ id: 's1', category: 'OldName', hours: 0.5 }])
      const monthRepo = new InMemoryMonthRepository({
        '2026-03': { '2026-03-01': { windows: [w] } },
      })
      const configRepo = new InMemoryConfigRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const data = await monthRepo.getMonth(2026, 3)
      expect(data['2026-03-01']?.windows[0]?.subtasks[0]?.category).toBe('NewName')
    })

    it('leaves days without the old category untouched', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-04': { '2026-04-01': { windows: [period('a', '_COREMEDIA')] } },
      })
      const configRepo = new InMemoryConfigRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const data = await monthRepo.getMonth(2026, 4)
      expect(data['2026-04-01']?.windows[0]?.category).toBe('_COREMEDIA')
    })

    it('renames both window.category and slice.category in the same window', async () => {
      const w = period('a', 'OldName', [{ id: 's1', category: 'OldName', hours: 0.5 }])
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { '2026-05-10': { windows: [w] } },
      })
      const configRepo = new InMemoryConfigRepository()

      await renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)

      const data = await monthRepo.getMonth(2026, 5)
      const win = data['2026-05-10']?.windows[0]
      expect(win?.category).toBe('NewName')
      expect(win?.subtasks[0]?.category).toBe('NewName')
    })

    it('handles months with no data without error', async () => {
      const monthRepo = new InMemoryMonthRepository({})
      const configRepo = new InMemoryConfigRepository()

      await expect(renameCategoryAcrossAllMonths('OldName', 'NewName', configRepo, monthRepo)).resolves.toBeUndefined()
    })
  })
})
