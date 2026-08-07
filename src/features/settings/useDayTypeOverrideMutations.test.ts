import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useDayStatusMutations } from './useDayTypeOverrideMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'

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

describe('useDayStatusMutations', () => {
  it('save sets dayTypeOverride on the day', async () => {
    const repo = new InMemoryMonthRepository()
    const qc = makeQC()
    const { result } = renderHook(() => useDayStatusMutations(repo), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      result.current.save.mutate({ date: '2024-06-10', dayTypeOverride: 'Vacation' })
      await flush()
    })

    const month = await repo.getMonth(2024, 6)
    expect(month['2024-06-10']?.dayTypeOverride).toBe('Vacation')
  })

  it('save with no dayTypeOverride removes it from the day', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2024-06-10', (day) => ({ ...day, dayTypeOverride: 'SickDay' as const }))

    const qc = makeQC()
    const { result } = renderHook(() => useDayStatusMutations(repo), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      result.current.save.mutate({ date: '2024-06-10' })
      await flush()
    })

    const month = await repo.getMonth(2024, 6)
    expect(month['2024-06-10']?.dayTypeOverride).toBeUndefined()
  })

  it('save does not affect other days', async () => {
    const repo = new InMemoryMonthRepository()
    const qc = makeQC()
    const { result } = renderHook(() => useDayStatusMutations(repo), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      result.current.save.mutate({ date: '2024-06-10', dayTypeOverride: 'PublicHoliday' })
      await flush()
    })

    const month = await repo.getMonth(2024, 6)
    expect(month['2024-06-11']?.dayTypeOverride).toBeUndefined()
  })

  it('save with no fields on a day without any status leaves the rest of the day intact', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2024-06-10', (day) => ({ ...day, note: 'hello' }))

    const qc = makeQC()
    const { result } = renderHook(() => useDayStatusMutations(repo), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      result.current.save.mutate({ date: '2024-06-10' })
      await flush()
    })

    const month = await repo.getMonth(2024, 6)
    expect(month['2024-06-10']?.note).toBe('hello')
    expect(month['2024-06-10']?.dayTypeOverride).toBeUndefined()
  })

  it('save sets halfDayLeave and clears any dayTypeOverride', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2024-06-10', (day) => ({ ...day, dayTypeOverride: 'Vacation' as const }))

    const qc = makeQC()
    const { result } = renderHook(() => useDayStatusMutations(repo), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      result.current.save.mutate({ date: '2024-06-10', halfDayLeave: 'SickDay' })
      await flush()
    })

    const month = await repo.getMonth(2024, 6)
    expect(month['2024-06-10']?.halfDayLeave).toBe('SickDay')
    expect(month['2024-06-10']?.dayTypeOverride).toBeUndefined()
  })

  it('save with a dayTypeOverride clears any existing halfDayLeave', async () => {
    const repo = new InMemoryMonthRepository()
    await repo.updateDay('2024-06-10', (day) => ({ ...day, halfDayLeave: 'Vacation' as const }))

    const qc = makeQC()
    const { result } = renderHook(() => useDayStatusMutations(repo), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      result.current.save.mutate({ date: '2024-06-10', dayTypeOverride: 'SickDay' })
      await flush()
    })

    const month = await repo.getMonth(2024, 6)
    expect(month['2024-06-10']?.halfDayLeave).toBeUndefined()
    expect(month['2024-06-10']?.dayTypeOverride).toBe('SickDay')
  })
})
