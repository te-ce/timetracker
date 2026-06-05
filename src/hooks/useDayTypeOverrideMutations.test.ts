import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useDayTypeOverrideMutations } from './useDayTypeOverrideMutations'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import type { WorkPeriod, Day, MonthData } from '../repositories/types'

vi.mock('../auth/msalInstance', () => ({
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

const date = '2026-06-04'

function period(id: string): WorkPeriod {
  return { id, start: '09:00', end: '10:00', category: 'Work', subtasks: [] }
}

function makeRepo(initial: Record<string, Day> = {}) {
  const monthData: MonthData = initial
  return new InMemoryMonthRepository({ '2026-06': monthData })
}

describe('useDayTypeOverrideMutations', () => {
  describe('save', () => {
    it('sets dayTypeOverride on the day', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')] } })
      const { result } = renderHook(() => useDayTypeOverrideMutations(repo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.save.mutate({ date, dayType: 'Vacation' })
        await flush()
      })

      const data = await repo.getMonth(2026, 6)
      expect(data[date]?.dayTypeOverride).toBe('Vacation')
    })

    it('updates an existing dayTypeOverride', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')], dayTypeOverride: 'Vacation' } })
      const { result } = renderHook(() => useDayTypeOverrideMutations(repo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.save.mutate({ date, dayType: 'SickDay' })
        await flush()
      })

      const data = await repo.getMonth(2026, 6)
      expect(data[date]?.dayTypeOverride).toBe('SickDay')
    })
  })

  describe('remove', () => {
    it('deletes dayTypeOverride from the day', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')], dayTypeOverride: 'Vacation' } })
      const { result } = renderHook(() => useDayTypeOverrideMutations(repo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.remove.mutate(date)
        await flush()
      })

      const data = await repo.getMonth(2026, 6)
      expect(data[date]?.dayTypeOverride).toBeUndefined()
    })
  })
})
