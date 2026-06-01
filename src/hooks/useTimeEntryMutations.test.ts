import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useTimeEntryMutations } from './useTimeEntryMutations'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import { useUndoStore } from '../stores/undoStore'
import type { TimeEntry } from '../repositories/types'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const date = '2026-05-25'
const entry: TimeEntry = { id: 'e1', category: '_COREMEDIA', hours: 4 }
const updatedEntry: TimeEntry = { id: 'e1', category: '_COREMEDIA', hours: 6 }

beforeEach(() => {
  useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
})

describe('useTimeEntryMutations', () => {
  it('save.mutate saves the entry and pushes an undo command', async () => {
    const repo = new InMemoryMonthRepository()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.save.mutate({ date, entry, previous: null })
      await new Promise((r) => setTimeout(r, 0))
    })

    const data = await repo.getMonth(2026, 5)
    const saved = data[date]?.entries ?? []
    expect(saved).toHaveLength(1)
    expect(saved[0]!.hours).toBe(4)
    expect(useUndoStore.getState().canUndo).toBe(true)
    expect(useUndoStore.getState().past[0]!.description).toBe('Add _COREMEDIA')
  })

  it('save.mutate for an existing entry uses "Edit" description', async () => {
    const repo = new InMemoryMonthRepository({ '2026-05': { [date]: { entries: [entry], windows: [] } } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.save.mutate({ date, entry: updatedEntry, previous: entry })
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(useUndoStore.getState().past[0]!.description).toBe('Edit _COREMEDIA')
  })

  it('undo after add removes the entry', async () => {
    const repo = new InMemoryMonthRepository()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.save.mutate({ date, entry, previous: null })
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => {
      await useUndoStore.getState().undo()
    })

    const data = await repo.getMonth(2026, 5)
    const remaining = data[date]?.entries ?? []
    expect(remaining).toHaveLength(0)
  })

  it('undo after edit restores the previous entry', async () => {
    const repo = new InMemoryMonthRepository({ '2026-05': { [date]: { entries: [entry], windows: [] } } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.save.mutate({ date, entry: updatedEntry, previous: entry })
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => {
      await useUndoStore.getState().undo()
    })

    const data = await repo.getMonth(2026, 5)
    const restored = data[date]?.entries ?? []
    expect(restored[0]!.hours).toBe(4)
  })

  it('redo after undo of add re-saves the entry', async () => {
    const repo = new InMemoryMonthRepository()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.save.mutate({ date, entry, previous: null })
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => { await useUndoStore.getState().undo() })
    await act(async () => { await useUndoStore.getState().redo() })

    const data = await repo.getMonth(2026, 5)
    const redone = data[date]?.entries ?? []
    expect(redone).toHaveLength(1)
    expect(redone[0]!.hours).toBe(4)
  })

  it('remove.mutate deletes the entry and pushes an undo command', async () => {
    const repo = new InMemoryMonthRepository({ '2026-05': { [date]: { entries: [entry], windows: [] } } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.remove.mutate({ date, entry })
      await new Promise((r) => setTimeout(r, 0))
    })

    const data = await repo.getMonth(2026, 5)
    const remaining = data[date]?.entries ?? []
    expect(remaining).toHaveLength(0)
    expect(useUndoStore.getState().canUndo).toBe(true)
    expect(useUndoStore.getState().past[0]!.description).toBe('Delete _COREMEDIA')
  })

  it('undo after delete restores the entry', async () => {
    const repo = new InMemoryMonthRepository({ '2026-05': { [date]: { entries: [entry], windows: [] } } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.remove.mutate({ date, entry })
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => { await useUndoStore.getState().undo() })

    const data = await repo.getMonth(2026, 5)
    const restored = data[date]?.entries ?? []
    expect(restored).toHaveLength(1)
    expect(restored[0]!.category).toBe('_COREMEDIA')
  })

  it('redo after undo of delete re-deletes the entry', async () => {
    const repo = new InMemoryMonthRepository({ '2026-05': { [date]: { entries: [entry], windows: [] } } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useTimeEntryMutations(repo), { wrapper: makeWrapper(queryClient) })

    await act(async () => {
      result.current.remove.mutate({ date, entry })
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => { await useUndoStore.getState().undo() })
    await act(async () => { await useUndoStore.getState().redo() })

    const data = await repo.getMonth(2026, 5)
    const final = data[date]?.entries ?? []
    expect(final).toHaveLength(0)
  })
})
