import { describe, it, expect, vi } from 'vitest'
import { renderHook, fireEvent } from '@testing-library/react'
import { useRetryOnFirstInteraction } from './useRetryOnFirstInteraction'

describe('useRetryOnFirstInteraction', () => {
  it('does not call retry until shouldRetry is true and an interaction occurs', () => {
    const retry = vi.fn()
    const { rerender } = renderHook(({ shouldRetry }) => useRetryOnFirstInteraction(shouldRetry, retry), {
      initialProps: { shouldRetry: false },
    })

    fireEvent.pointerDown(document)
    expect(retry).not.toHaveBeenCalled()

    rerender({ shouldRetry: true })
    expect(retry).not.toHaveBeenCalled()
  })

  it('calls retry on the first pointerdown once shouldRetry is true', () => {
    const retry = vi.fn()
    renderHook(() => useRetryOnFirstInteraction(true, retry))

    fireEvent.pointerDown(document)
    expect(retry).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(document)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('calls retry on the first keydown once shouldRetry is true', () => {
    const retry = vi.fn()
    renderHook(() => useRetryOnFirstInteraction(true, retry))

    fireEvent.keyDown(document)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('removes listeners when shouldRetry goes back to false', () => {
    const retry = vi.fn()
    const { rerender } = renderHook(({ shouldRetry }) => useRetryOnFirstInteraction(shouldRetry, retry), {
      initialProps: { shouldRetry: true },
    })

    rerender({ shouldRetry: false })
    fireEvent.pointerDown(document)
    expect(retry).not.toHaveBeenCalled()
  })
})
