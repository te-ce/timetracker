import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClock } from './useClock'

describe('useClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25, 9, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reflects the current time on a render triggered between ticks', () => {
    const { result, rerender } = renderHook(() => useClock(true))
    expect(result.current).toBe('09:00')

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 25, 9, 0, 30))
    })
    rerender()

    expect(result.current).toBe('09:00')

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 25, 9, 1, 0))
    })
    rerender()

    expect(result.current).toBe('09:01')
  })
})
