import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useMonthGridMutations, calendarBaseDayType } from './useMonthGridMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthData, WorkPeriod } from '../../infra/repositories/types'

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

const YEAR = 2026
const MONTH = 5
const date = '2026-05-15' // Friday

function makeRepo(initial: Record<string, { windows: WorkPeriod[] }> = {}) {
  return new InMemoryMonthRepository({ '2026-05': initial })
}

function renderMutations(repo: InMemoryMonthRepository, monthData: MonthData = {}) {
  return renderHook(() => useMonthGridMutations({ repository: repo, year: YEAR, month: MONTH, monthData }), {
    wrapper: makeWrapper(makeQC()),
  })
}

describe('calendarBaseDayType', () => {
  it('classifies a weekday as WorkDay', () => {
    expect(calendarBaseDayType('2026-05-15')).toBe('WorkDay') // Friday
  })

  it('classifies Saturday and Sunday as Weekend', () => {
    expect(calendarBaseDayType('2026-05-16')).toBe('Weekend') // Saturday
    expect(calendarBaseDayType('2026-05-17')).toBe('Weekend') // Sunday
  })
})

describe('useMonthGridMutations', () => {
  it('dayType sets a non-calendar override', async () => {
    const repo = makeRepo({ [date]: { windows: [] } })
    const { result } = renderMutations(repo, { [date]: { windows: [] } })

    await act(async () => {
      result.current.dayType.mutate({ date, value: 'Vacation' })
      await flush()
    })

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[date]?.dayTypeOverride).toBe('Vacation')
  })

  it('dayType clears the override when set back to the calendar base', async () => {
    const repo = makeRepo({ [date]: { windows: [] } })
    const { result } = renderMutations(repo, { [date]: { windows: [] } })

    await act(async () => {
      result.current.dayType.mutate({ date, value: 'Vacation' })
      await flush()
    })
    await act(async () => {
      result.current.dayType.mutate({ date, value: 'WorkDay' })
      await flush()
    })

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[date]?.dayTypeOverride).toBeUndefined()
  })

  it('location sets a work location on the day', async () => {
    const repo = makeRepo({ [date]: { windows: [] } })
    const { result } = renderMutations(repo, { [date]: { windows: [] } })

    await act(async () => {
      result.current.location.mutate({ date, location: 'Office' })
      await flush()
    })

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[date]?.location).toBe('Office')
  })

  it('location clears the day location when set to null', async () => {
    const repo = makeRepo({ [date]: { windows: [] } })
    const { result } = renderMutations(repo, { [date]: { windows: [] } })

    await act(async () => {
      result.current.location.mutate({ date, location: 'Office' })
      await flush()
    })
    await act(async () => {
      result.current.location.mutate({ date, location: null })
      await flush()
    })

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[date]?.location).toBeUndefined()
  })
})
