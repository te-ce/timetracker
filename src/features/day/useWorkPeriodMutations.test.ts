import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { useUndoStore } from '../../shared/undoStore'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const date = '2026-05-25'

function period(id: string, start: string, end: string | null): WorkPeriod {
  return { id, start, end, category: '', subtasks: [] }
}

function makeRepo(windows: WorkPeriod[] = []) {
  return new InMemoryMonthRepository({
    '2026-05': { [date]: { windows } },
  })
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('useWorkPeriodMutations', () => {
  describe('save', () => {
    it('adds a new work period', async () => {
      const repo = makeRepo()
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.save.mutate({ date, window: period('a', '09:00', '10:00') })
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows).toHaveLength(1)
    })

    it('removes a work period', async () => {
      const repo = makeRepo([period('a', '09:00', '10:00')])
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.remove.mutate({ date, id: 'a' })
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows ?? []).toHaveLength(0)
    })
  })

  describe('undo/redo', () => {
    beforeEach(() => {
      useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
    })

    it('save registers an undo command that restores the previous state', async () => {
      const repo = makeRepo()
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.save.mutate({ date, window: period('a', '09:00', '10:00') })
        await flush()
      })

      expect(useUndoStore.getState().canUndo).toBe(true)

      await act(async () => {
        await useUndoStore.getState().undo()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows ?? []).toHaveLength(0)
    })

    it('save undo then redo re-applies the saved period', async () => {
      const repo = makeRepo()
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.save.mutate({ date, window: period('a', '09:00', '10:00') })
        await flush()
      })

      await act(async () => {
        await useUndoStore.getState().undo()
      })
      await act(async () => {
        await useUndoStore.getState().redo()
      })

      const data = await repo.getMonth(2026, 5)
      const windows = data[date]?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]?.id).toBe('a')
    })

    it('remove registers an undo command that restores the deleted period', async () => {
      const repo = makeRepo([period('a', '09:00', '10:00')])
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.remove.mutate({ date, id: 'a' })
        await flush()
      })

      expect(useUndoStore.getState().canUndo).toBe(true)

      await act(async () => {
        await useUndoStore.getState().undo()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows ?? []).toHaveLength(1)
    })

    it('setPeriodCategory undo restores the previous category', async () => {
      const p = { ...period('a', '09:00', '10:00'), category: 'Alpha' }
      const repo = makeRepo([p])
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.setPeriodCategory.mutate({ date, periodId: 'a', category: 'Beta' })
        await flush()
      })

      expect(useUndoStore.getState().canUndo).toBe(true)

      await act(async () => {
        await useUndoStore.getState().undo()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows[0]?.category).toBe('Alpha')
    })

    it('deleteSubtask undo restores the removed subtask', async () => {
      const subtask: WorkPeriodSubtask = { id: 's1', category: 'Alpha', hours: 1 }
      const p: WorkPeriod = { ...period('a', '09:00', '10:00'), subtasks: [subtask] }
      const repo = makeRepo([p])
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.deleteSubtask.mutate({ date, periodId: 'a', subtaskId: 's1' })
        await flush()
      })

      expect(useUndoStore.getState().canUndo).toBe(true)

      await act(async () => {
        await useUndoStore.getState().undo()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows[0]?.subtasks).toHaveLength(1)
    })
  })

  describe('saveWithAbsorbed — atomic merge', () => {
    it('saves the merged window and removes absorbed in one operation', async () => {
      const existing = period('a', '09:00', '10:00')
      const repo = makeRepo([existing])
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      const merged = period('b', '09:00', '11:00')

      await act(async () => {
        result.current.saveWithAbsorbed.mutate({ date, window: merged, absorbed: ['a'] })
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      const windows = data[date]?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]?.start).toBe('09:00')
      expect(windows[0]?.end).toBe('11:00')
      expect(windows[0]?.id).toBe('b')
    })

    it('removes all absorbed periods when merging a chain', async () => {
      const a = period('a', '07:00', '09:00')
      const b = period('b', '09:00', '10:00')
      const repo = makeRepo([a, b])
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      const merged = period('c', '07:00', '10:00')

      await act(async () => {
        result.current.saveWithAbsorbed.mutate({ date, window: merged, absorbed: ['a', 'b'] })
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      const windows = data[date]?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]?.start).toBe('07:00')
      expect(windows[0]?.end).toBe('10:00')
    })

    it('works with an empty absorbed list (no merge needed)', async () => {
      const repo = makeRepo()
      const { result } = renderHook(() => useWorkPeriodMutations(repo), { wrapper: makeWrapper(makeQC()) })

      await act(async () => {
        result.current.saveWithAbsorbed.mutate({ date, window: period('a', '09:00', '10:00'), absorbed: [] })
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows).toHaveLength(1)
    })
  })
})
