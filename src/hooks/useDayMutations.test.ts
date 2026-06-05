import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useDayMutations } from './useDayMutations'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import type { WorkPeriod } from '../repositories/types'

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

const date = '2026-05-15'

function period(id: string): WorkPeriod {
  return { id, start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }
}

function makeRepo(initial: Record<string, { windows: WorkPeriod[]; confirmed?: boolean; note?: string }> = {}) {
  return new InMemoryMonthRepository({ '2026-05': initial })
}

describe('useDayMutations', () => {
  describe('confirm', () => {
    it('sets confirmed to true', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')] } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.confirm.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.confirmed).toBe(true)
    })
  })

  describe('unconfirm', () => {
    it('sets confirmed to false', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')], confirmed: true } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.unconfirm.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.confirmed).toBe(false)
    })
  })

  describe('toggleLocation', () => {
    it('switches Remote to Office', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')] } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.toggleLocation.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.location).toBe('Office')
    })

    it('switches Office to Remote', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')] } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Office', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.toggleLocation.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.location).toBe('Remote')
    })
  })

  describe('saveNote', () => {
    it('saves a note to the day', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')] } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.saveNote.mutate('standup done')
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.note).toBe('standup done')
    })

    it('removes the note when empty string is passed', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')], note: 'old note' } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.saveNote.mutate('')
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.note).toBeUndefined()
    })

    it('overwrites an existing note', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a')], note: 'old note' } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.saveNote.mutate('new note')
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.note).toBe('new note')
    })
  })

  describe('resetDay', () => {
    it('clears all windows from the day', async () => {
      const repo = makeRepo({ [date]: { windows: [period('a'), period('b')] } })
      const { result } = renderHook(() => useDayMutations({ date, effectiveLocation: 'Remote', repository: repo }), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.resetDay.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows ?? []).toHaveLength(0)
    })
  })
})
