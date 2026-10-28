import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useDeleteMonth } from './useDeleteMonth'
import { useUndoStore } from './undoStore'
import { RepositoryProvider } from '../infra/repositories/RepositoryContext'
import {
  InMemoryConfigRepository,
  InMemoryMonthRepository,
  InMemorySprintExportRepository,
  InMemoryTrashRepository,
} from '../infra/repositories/in-memory'

function setup() {
  const monthRepo = new InMemoryMonthRepository({ '2026-10': { '2026-10-27': { windows: [], note: 'before' } } })
  const trashRepo = new InMemoryTrashRepository(monthRepo)
  const repos = {
    monthRepo,
    trashRepo,
    configRepo: new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
  }
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repos={repos}>{children}</RepositoryProvider>
    </QueryClientProvider>
  )
  const { result } = renderHook(() => useDeleteMonth(2026, 10, 'October 2026'), { wrapper })
  return { monthRepo, trashRepo, result }
}

describe('useDeleteMonth', () => {
  beforeEach(() => {
    useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
  })

  it('redo puts what is in the month now into the trash, not the first snapshot', async () => {
    const { monthRepo, trashRepo, result } = setup()
    await act(() => result.current.mutateAsync())
    await act(() => useUndoStore.getState().undo())
    await monthRepo.updateDay('2026-10-28', (d) => ({ ...d, note: 'tracked after undo' }))

    await act(() => useUndoStore.getState().redo())

    expect(await monthRepo.getMonth(2026, 10)).toEqual({})
    const [entry] = await trashRepo.list()
    await trashRepo.restore(entry?.id ?? '')
    expect((await monthRepo.getMonth(2026, 10))['2026-10-28']?.note).toBe('tracked after undo')
  })

  it('undo after redo brings back the month as it was at redo', async () => {
    const { monthRepo, result } = setup()
    await act(() => result.current.mutateAsync())
    await act(() => useUndoStore.getState().undo())
    await monthRepo.updateDay('2026-10-28', (d) => ({ ...d, note: 'tracked after undo' }))
    await act(() => useUndoStore.getState().redo())

    await act(() => useUndoStore.getState().undo())

    expect((await monthRepo.getMonth(2026, 10))['2026-10-28']?.note).toBe('tracked after undo')
  })
})
