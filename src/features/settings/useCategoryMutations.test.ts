import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useCategoryMutations } from './useCategoryMutations'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return { ...DEFAULT_APP_CONFIG, ...overrides }
}

describe('useCategoryMutations', () => {
  describe('setAutoCategory', () => {
    it('saves config with the new autoCategory value', async () => {
      const config = makeConfig({ customCategories: ['Work'] })
      const configRepo = new InMemoryConfigRepository(config)
      const monthRepo = new InMemoryMonthRepository()
      const { result } = renderHook(() => useCategoryMutations(config, configRepo, monthRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.setAutoCategory.mutate('Work')
        await flush()
      })

      expect((await configRepo.get()).autoCategory).toBe('Work')
    })

    it('saves null to clear the autoCategory', async () => {
      const config = makeConfig({ autoCategory: 'Work' })
      const configRepo = new InMemoryConfigRepository(config)
      const monthRepo = new InMemoryMonthRepository()
      const { result } = renderHook(() => useCategoryMutations(config, configRepo, monthRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.setAutoCategory.mutate(null)
        await flush()
      })

      expect((await configRepo.get()).autoCategory).toBeNull()
    })
  })

  describe('reorderCategories', () => {
    it('saves config with the new category order', async () => {
      const config = makeConfig({ customCategories: ['A', 'B', 'C'] })
      const configRepo = new InMemoryConfigRepository(config)
      const monthRepo = new InMemoryMonthRepository()
      const { result } = renderHook(() => useCategoryMutations(config, configRepo, monthRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.reorderCategories.mutate(['C', 'A', 'B'])
        await flush()
      })

      expect((await configRepo.get()).categoryOrder).toEqual(['C', 'A', 'B'])
    })
  })

  describe('renameCategory', () => {
    it('renames the category in config customCategories', async () => {
      const config = makeConfig({ customCategories: ['Design', 'Dev'] })
      const configRepo = new InMemoryConfigRepository(config)
      const monthRepo = new InMemoryMonthRepository()
      const { result } = renderHook(() => useCategoryMutations(config, configRepo, monthRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.renameCategory.mutate({ oldName: 'Design', newName: 'UX' })
        await flush()
      })

      expect((await configRepo.get()).customCategories).toContain('UX')
      expect((await configRepo.get()).customCategories).not.toContain('Design')
    })
  })

  describe('setCategoryDescription', () => {
    it('adds a description for a category', async () => {
      const config = makeConfig({ customCategories: ['Work'] })
      const configRepo = new InMemoryConfigRepository(config)
      const monthRepo = new InMemoryMonthRepository()
      const { result } = renderHook(() => useCategoryMutations(config, configRepo, monthRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.setCategoryDescription.mutate({ category: 'Work', description: 'Daily work' })
        await flush()
      })

      expect((await configRepo.get()).categoryDescriptions?.['Work']).toBe('Daily work')
    })

    it('removes a description when empty string is passed', async () => {
      const config = makeConfig({
        customCategories: ['Work'],
        categoryDescriptions: { Work: 'Daily work' },
      })
      const configRepo = new InMemoryConfigRepository(config)
      const monthRepo = new InMemoryMonthRepository()
      const { result } = renderHook(() => useCategoryMutations(config, configRepo, monthRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.setCategoryDescription.mutate({ category: 'Work', description: '' })
        await flush()
      })

      expect((await configRepo.get()).categoryDescriptions?.['Work']).toBeUndefined()
    })
  })
})
