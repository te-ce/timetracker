import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { reorderArray, useDragReorder } from './reorder'

describe('reorderArray', () => {
  it('moves an item from one index to another', () => {
    expect(reorderArray(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('moves an item backwards', () => {
    expect(reorderArray(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('clamps an out-of-range target index', () => {
    expect(reorderArray(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
    expect(reorderArray(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b'])
  })

  it('returns the original array when from equals the clamped to', () => {
    const items = ['a', 'b', 'c']
    expect(reorderArray(items, 1, 1)).toBe(items)
  })
})

describe('useDragReorder', () => {
  it('calls onReorder with the reordered array on drop', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => {
      result.current.handleDragStart(0)
      result.current.handleDrop(2)
    })

    expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a'])
  })

  it('does not call onReorder when dropped on the same index', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => {
      result.current.handleDragStart(1)
      result.current.handleDrop(1)
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('tracks dragOverIdx while dragging over', () => {
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], vi.fn()))

    act(() => {
      result.current.handleDragOver({ preventDefault: () => {} }, 2)
    })

    expect(result.current.dragOverIdx).toBe(2)
  })

  it('clears drag state on dragEnd', () => {
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], vi.fn()))

    act(() => {
      result.current.handleDragOver({ preventDefault: () => {} }, 1)
      result.current.handleDragEnd()
    })

    expect(result.current.dragOverIdx).toBeNull()
  })
})
